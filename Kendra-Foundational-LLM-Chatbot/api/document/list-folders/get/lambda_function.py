# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


import os
import json
import boto3


DOCUMENTS_TABLE = os.getenv('DOCUMENTS_TABLE')

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(DOCUMENTS_TABLE)

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
    docs_list = []
    response = table.scan()

    if "Items" in response:
        docs_list = response["Items"]
        while "LastEvaluatedKey" in response:
            response = table.scan(
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            docs_list.extend(response["Items"])

    unique_keys = []          
    docs_list.sort(key=lambda x: x['CreatedOn'], reverse=True)
    for doc in docs_list:
        if doc['KeyPrefix'] not in unique_keys:
            unique_keys.append(doc['KeyPrefix'])

    final_list = []
    for key in unique_keys:
        final_list.append({
            "label": key,
            "value": key
        })
    return final_list

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
