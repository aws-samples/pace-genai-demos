# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import json
import boto3


SYNC_RUN_TABLE = os.getenv('SYNC_RUN_TABLE')

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(SYNC_RUN_TABLE)

def build_response(message, code=200):
    return {
        "statusCode": code,
        "headers": {
            "Cache-Control": "no-cache, no-store",
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(message),
        "isBase64Encoded": False
    }

def query_docs():
    response = table.scan()
    docs_list = response['Items']
    docs_list.sort(key=lambda x: x['CreatedOn'], reverse=True)
    return docs_list

def lambda_handler(event, _):
    try:
        print(event)
        response = query_docs()
        return build_response(response)
    except Exception as e:
        print(e)
        return build_response(str(e), 500)

if __name__ == "__main__":
    output = lambda_handler({},{})
    print(output)
