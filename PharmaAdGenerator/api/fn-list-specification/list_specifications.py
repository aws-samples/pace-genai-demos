# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

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
    # The Lambda environment pre-configures a handler logging to stderr. If a handler is already configured,
    # `.basicConfig` does not execute. Thus we set the level directly.
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
            "Cache-Control": "no-cache, no-store",  # tell cloudfront and api gateway not to cache the response
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",  # allow CORS from anywhere
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
