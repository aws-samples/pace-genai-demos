# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import os
import boto3
import traceback
import logging
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')
logger = logging.getLogger()

def mark_document_as_failed(document_id, dynamodb_table_name):
    table = dynamodb.Table(dynamodb_table_name)
    response = table.update_item(
        Key={
            'id': document_id
        },
        UpdateExpression="SET document_status = :status",
        ExpressionAttributeValues={
            ':status': "FAILED"
        }
    )
    return response

def lambda_handler(event, context):

    dynamodb_table_name = os.environ["DYNAMODB_TABLE_NAME"]
    errors = [] # List to keep track of errors
    
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        event_time = event['Records'][0]['eventTime']
        
        if key.endswith("-vectorstore.pkl.zip"):
            try:
                default_document_name = key.replace(".pkl.zip", "")
                default_id = key.replace(".pkl.zip", ".pdf")

                item = {
                    'id': default_id,
                    'documentName': default_document_name,
                    'document_status': "COMPLETED",
                    'uploadDate': event_time,
                    'versionId': "default",
                    'vector': key,        
                    }

                table = dynamodb.Table(dynamodb_table_name)
                table.put_item(Item=item) 

            except Exception as ce:
                # Handle other unexpected errors.
                mark_document_as_failed(key, dynamodb_table_name)
                errors.append({
                    'statusCode': 500,
                    'type': 'ClientError',
                    'message': str(ce)
                })
                logger.error(traceback.format_exc())
                logger.error("ClientError error for updating document with ID: %s. Error: %s", default_id, str(ce))


            except Exception as e:
                # Handle other unexpected errors.
                mark_document_as_failed(key, dynamodb_table_name)
                errors.append({
                    'statusCode': 500,
                    'type': 'UnexpectedError',
                    'message': str(e)
                    })
                logger.error(traceback.format_exc())
                logger.error("Unexpected error for updating document with ID: %s. Error: %s", default_id, key, str(e))

    if errors:
        return {
            'statusCode': 500,
            'errors': errors
        }

    else:
        return {
            'statusCode': 200,
            'message': f"Marked document with ID {default_id} as FAILED in {dynamodb_table_name}.",
            'document_id': default_id
        }
