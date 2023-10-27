# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


import os
import json
import boto3
import urllib.parse
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal

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

def replace_decimals(obj):
    if isinstance(obj, list):
        return [replace_decimals(o) for o in obj]
    elif isinstance(obj, dict):
        return {k: replace_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    else:
        return obj

def lambda_handler(event, _):
    try:
        print(event)
        key_prefix =  urllib.parse.unquote(event['queryStringParameters']['key_prefix'])
        response = table.query(
            IndexName="KEY_PREFIX_CREATED_ON_INDEX",
            KeyConditionExpression=Key("KeyPrefix").eq(key_prefix)
        )

        folders = []
        if "Items" in response:
            folders = response["Items"]

        return build_response(json.dumps(replace_decimals(folders)))
    except Exception as e:
        print(e)
        return build_response(str(e), 500)

if __name__ == "__main__":
    output = lambda_handler({},{})
    print(output)


