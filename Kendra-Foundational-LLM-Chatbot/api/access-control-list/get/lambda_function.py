# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import json
import boto3

s3_resource = boto3.resource("s3")
KENDRA_INGESTION_BUCKET_NAME = os.environ['KENDRA_INGESTION_BUCKET_NAME']

def build_response(kcl_file_content, code=200):
    return {
        "statusCode": code,
        "headers": {
            "Cache-Control": "no-cache, no-store",
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": kcl_file_content,
        "isBase64Encoded": False
    }


def lambda_handler(event, _):
    try:
        print(event)
        kcl_file_content = ""
        file_content = s3_resource.Object(KENDRA_INGESTION_BUCKET_NAME, "kendra_acl.json").get()['Body'].read().decode('utf-8')
        """ for line in file_content:
            kcl_file_content += str(line) + "\n" """
            
        return build_response(file_content)
    except Exception as e:
        print(e)
        return build_response(str(e), 500)

if __name__ == "__main__":
    output = lambda_handler({},{})
    print(output)
