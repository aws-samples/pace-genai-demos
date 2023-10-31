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
from datetime import datetime
import json
import logging
import os
import traceback

# region Logging

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logger = logging.getLogger()

if logger.hasHandlers():

    logger.setLevel(LOG_LEVEL)
else:
    logging.basicConfig(level=LOG_LEVEL)

# endregion

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


def build_response(http_code, body):
    return {
        "headers": {
            "Cache-Control": "no-cache, no-store",  
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  
        },
        "statusCode": http_code,
        "body": body,
    }


def get_specifications():
    specifications = []
    response = ddb_client.scan(TableName=os.environ["DDB_TABLE_NAME"])
    if response["Items"]:
        for item in response["Items"]:
            time_format = (item["timestamp"]["N"])
            new_time = datetime.utcfromtimestamp(int(time_format))
            new_time_str = new_time.isoformat()
            
            specifications.append(
                {
                    "id": item["id"]["S"],
                    "timestamp": new_time_str,
                    "uid": item["uid"]["S"],
                    "document_type":item["document_type"]["S"],
                    "document_status": item["document_status"]["S"],
                }
            )

    return specifications


def lambda_handler(event, context):
    logger.info(mask_sensitive_data(event))
    try:
        response = get_specifications()
        return build_response(200, json.dumps(response))

    except Exception as ex:
        logger.error(traceback.format_exc())


if __name__ == "__main__":
    example_event = {}
    response = lambda_handler(example_event, {})
    print(json.dumps(response))
