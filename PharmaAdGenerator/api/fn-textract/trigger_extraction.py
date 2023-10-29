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

import boto3
import json
import logging
import os
import traceback
from datetime import datetime
import random
import string

# region Logging

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()

ddb_table = os.environ.get("DDB_TABLE_NAME")
textract_client = boto3.client("textract")
ddb_client = boto3.client("dynamodb")

if logger.hasHandlers():
    # The Lambda environment pre-configures a handler logging to stderr. If a handler is already configured,
    # `.basicConfig` does not execute. Thus we set the level directly.
    logger.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)

# endregion

textract_client = boto3.client("textract")

def generate_uid(length=12):
    chars = string.ascii_letters + string.digits  # A-Z, a-z, 0-9
    return ''.join(random.choice(chars) for _ in range(length))


def trigger_textract(s3_object):
    logger.info(f"Triggering textract for {s3_object}")
    response = textract_client.start_document_text_detection(
        DocumentLocation={
            "S3Object": s3_object,
        },
        NotificationChannel={
            "SNSTopicArn": os.environ["SNS_TOPIC_ARN"],
            "RoleArn": os.environ["SNS_ROLE_ARN"],
        },
    )
    s3_value = s3_object["Name"]
    if ("reference-specifications" in s3_value):
            uid = generate_uid()
            ddb_client.put_item(
            TableName = ddb_table,
                Item={
                    "id": {"S": s3_value.replace('public/', '')},
                    "uid": {"S": uid},
                    "document_type": {"S": "PDF"},
                    "timestamp": {"N": str(int(datetime.now().timestamp()))},
                    "textract_response": {"S": ""},
                    "document_status": {"S": "Processing"},
                },
        )
    return response


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


def lambda_handler(event, context):
    logger.info(mask_sensitive_data(event))

    try:
        records = event.get("Records", [])
        for record in records:
            if "s3" in record:
                bucket_name = record["s3"]["bucket"]["name"]
                object_key = record["s3"]["object"]["key"]
                s3_object = {"Bucket": bucket_name, "Name": object_key}
                logger.info(f"S3 object: \n{s3_object}")
                textract_results = trigger_textract(s3_object)
                logger.info(textract_results)
        response = {"text": "Example response from authenticated api"}
        logger.info(response)

    except Exception as ex:
        logger.error(traceback.format_exc())


if __name__ == "__main__":
    example_event = {}
    response = lambda_handler(example_event, {})
    print(json.dumps(response))
