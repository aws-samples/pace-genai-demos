# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# Permission is hereby granted, free of charge, to any person obtaining a copy of this
# software and associated documentation files (the "Software"), to deal in the Software
# without restriction, including without limitation the rights to use, copy, modify,
# merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# --
# --  Author:        Jin Tan Ruan
# --  Date:          04/11/2023
# --  Purpose:       Saves Results
# --  Version:       0.1.0
# --  Disclaimer:    This code is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

import boto3
from datetime import datetime
import json
import logging
import os
import traceback

 
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()

if logger.hasHandlers():
    # The Lambda environment pre-configures a handler logging to stderr. If a handler is already configured,
    # `.basicConfig` does not execute. Thus we set the level directly.
    logger.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)

ddb_table = os.environ.get("DDB_TABLE_NAME")
textract_client = boto3.client("textract")
ddb_client = boto3.client("dynamodb")

def mask_sensitive_data(event):
    # remove sensitive data from request object before logging
    keys_to_redact = ["authorization"]
    result = {}
    for k, v in event.items():
        if isinstance(v, dict):
            result[k] = mask_sensitive_data(v)
        elif k in keys_to_redact:
            result[k] = "<redacted>"
        else:
            result[k] = v
    return result


def get_line_columns(textract_response):
    columns = []
    lines = []
    for item in textract_response["Blocks"]:
        if item["BlockType"] == "LINE":
            column_found = False
            for index, column in enumerate(columns):
                bbox_left = item["Geometry"]["BoundingBox"]["Left"]
                bbox_right = (
                    item["Geometry"]["BoundingBox"]["Left"]
                    + item["Geometry"]["BoundingBox"]["Width"]
                )
                bbox_centre = (
                    item["Geometry"]["BoundingBox"]["Left"]
                    + item["Geometry"]["BoundingBox"]["Width"] / 2
                )
                column_centre = column["left"] + column["right"] / 2

                if (bbox_centre > column["left"] and bbox_centre < column["right"]) or (
                    column_centre > bbox_left and column_centre < bbox_right
                ):
                    # Bbox appears inside the column
                    lines.append([index, item["Text"]])
                    column_found = True
                    break
            if not column_found:
                columns.append(
                    {
                        "left": item["Geometry"]["BoundingBox"]["Left"],
                        "right": item["Geometry"]["BoundingBox"]["Left"]
                        + item["Geometry"]["BoundingBox"]["Width"],
                    }
                )
                lines.append([len(columns) - 1, item["Text"]])

    lines.sort(key=lambda x: x[0])
    return "\n".join([line[1] for line in lines]) if lines else ""


def get_line_texts(textract_reponse):
    by_id = {
        block["Id"]: block["Text"]
        for block in textract_reponse["Blocks"]
        if block["BlockType"] == "LINE"
    }
    lines = []
    for block in textract_reponse["Blocks"]:
        if block["BlockType"] == "PAGE":
            children = block["Relationships"][0]["Ids"]
            for child in children:
                if child in by_id:
                    lines.append(by_id[child])
    return "\n".join(lines) if lines else ""

def save_response(textract_response, s3_document_location):
    logger.info("Saving response to DDB")
    logger.info(f"DDB location {s3_document_location}")
    logger.info(f"DDB table {ddb_table}")
    logger.info(f"Response {textract_response}")
    ddb_id = "/".join(s3_document_location["S3ObjectName"].split("/")[1:])
    # line_texts = get_line_texts(textract_response)
    line_texts = get_line_columns(textract_response)
    logger.info(f"Line texts {line_texts}")
    new_status = "Completed"
    item_key = {"id": {"S": ddb_id}}

    ddb_client.update_item(
        TableName=ddb_table, 
        Key=item_key,
        UpdateExpression='SET document_status = :document_status, textract_response = :textract_response',
        ExpressionAttributeValues={
            ':document_status': {"S": new_status},
            ':textract_response': {"S": line_texts}
        }
    )


def lambda_handler(event, context):
    logger.info(mask_sensitive_data(event))

    try:
        records = event.get("Records", [])
        for record in records:
            if "Sns" in record:
                message = json.loads(record["Sns"]["Message"])
                logger.info(message)
                textract_job_id = message.get("JobId")
                logger.info(f"Textract job id {textract_job_id}")
                s3_document_location = message.get("DocumentLocation")
                logger.info(f"S3 object bucket {s3_document_location}")
                if textract_job_id:
                    # TODO: fetch NextToken if present
                    response = textract_client.get_document_text_detection(
                        JobId=textract_job_id
                    )
                    if response:
                        save_response(response, s3_document_location)

    except Exception as ex:
        logger.error(traceback.format_exc())

if __name__ == "__main__":
    example_event = {}
    response = lambda_handler(example_event, {})
    print(json.dumps(response))
