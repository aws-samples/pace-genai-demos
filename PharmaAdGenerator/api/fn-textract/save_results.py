# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

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




# def save_response(aggregated_texts, s3_document_location):
#     ddb_table = os.environ.get("DDB_TABLE_NAME")
#     logger.info("Saving aggregated response to DDB")
#     logger.info(f"DDB location {s3_document_location}")
#     logger.info(f"DDB table {ddb_table}")
#     logger.info(f"Aggregated texts {aggregated_texts}")

#     ddb_id = "/".join(s3_document_location["S3ObjectName"].split("/")[1:])
    
#     # Convert the list of aggregated texts to a single string
#     new_response = "".join(aggregated_texts)
#     new_status = "Completed"
#     item_key = {"id": {"S": ddb_id}}

#     ddb_client.update_item(
#         TableName=ddb_table, 
#         Key=item_key,
#         UpdateExpression='SET document_status = :document_status, textract_response = :textract_response',
#         ExpressionAttributeValues={
#             ':document_status': {"S": new_status},
#             ':textract_response': {"S": new_response}
#         }
#     )

# def lambda_handler(event, context):
#     logger.info(mask_sensitive_data(event))
#     aggregated_texts = []  # List to store aggregated texts

#     try:
#         records = event.get("Records", [])
#         for record in records:
#             if "Sns" in record:
#                 message = json.loads(record["Sns"]["Message"])
#                 logger.info(message)
#                 textract_job_id = message.get("JobId")
#                 logger.info(f"Textract job id {textract_job_id}")
#                 s3_document_location = message.get("DocumentLocation")
#                 logger.info(f"S3 object bucket {s3_document_location}")
#                 if textract_job_id:
#                     response = textract_client.get_document_text_detection(
#                         JobId=textract_job_id
#                     )
#                     # Assuming get_line_columns() returns a list
#                     aggregated_texts.extend(get_line_columns(response))

#                     while 'NextToken' in response:
#                         response = textract_client.get_document_text_detection(
#                             JobId=textract_job_id,
#                             NextToken=response['NextToken']
#                         )
#                         aggregated_texts.extend(get_line_columns(response))

#         # After processing all pages, save the aggregated results
#         if aggregated_texts:
#             save_response(aggregated_texts, s3_document_location)

#     except Exception as ex:
#         logger.error(traceback.format_exc())
