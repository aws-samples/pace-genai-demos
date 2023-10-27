# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import boto3
import os

def lambda_handler(event, context):
    # Retrieve the DynamoDB table name from the event payload
    DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE_NAME"]
    table_name = DYNAMODB_TABLE_NAME

    # Create a DynamoDB client
    dynamodb = boto3.client('dynamodb')

    try:
        response = dynamodb.scan(TableName=table_name)

        # Extract the items from the response
        items = response['Items']
        result = json.dumps(items)

        return {
            'statusCode': 200,
            'body': result
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': str(e)
        }