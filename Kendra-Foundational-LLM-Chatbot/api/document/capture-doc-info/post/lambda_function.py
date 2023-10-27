# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import json
import boto3
from datetime import datetime

DOCUMENTS_TABLE = os.getenv('DOCUMENTS_TABLE')

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(DOCUMENTS_TABLE)

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


def lambda_handler(event, _):
    try:
        print(event)
        body = json.loads(event["body"]) if "body" in event else json.loads(event)
        body["CreatedOn"] = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")

        docId = body['DocId']
        doc_parts = docId.split("/")
        key_prefix = docId[0:len(docId) - len(doc_parts[len(doc_parts)-1]) - 1] # Removes the /FileName at the end of the Key
        item = {
                "DocId": body['DocId'],
                "CreatedOn": body['CreatedOn'],
                "KeyPrefix": "/public" if not key_prefix else key_prefix
            }
        table.put_item(Item=item)
        
        
        return build_response()
    except Exception as e:
        print(e)
        return build_response(str(e), 500)

if __name__ == "__main__":
    output = lambda_handler({},{})
    print(output)
