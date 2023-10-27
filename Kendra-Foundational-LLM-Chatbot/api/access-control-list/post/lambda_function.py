# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


import os
import json
import boto3

s3_resource = boto3.resource("s3")
KENDRA_INGESTION_BUCKET_NAME = os.environ['KENDRA_INGESTION_BUCKET_NAME']

def build_response(code=200):
    return {
        "statusCode": code,
        "headers": {
            "Cache-Control": "no-cache, no-store",
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "isBase64Encoded": False
    }


def lambda_handler(event, context):
    try:
        print(event)
        body = json.loads(event["body"]) if "body" in event else json.loads(event)
        object = s3_resource.Object(
            bucket_name=KENDRA_INGESTION_BUCKET_NAME, 
            key='kendra_acl.json'
        )
        object.put(Body=json.dumps(body))
        return build_response()
    except Exception as e:
        print(e)
        return build_response(str(e), 500)

if __name__ == "__main__":
    output = lambda_handler({},{})
    print(output)
