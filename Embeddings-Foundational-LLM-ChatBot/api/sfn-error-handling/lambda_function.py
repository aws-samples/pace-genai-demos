# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import os
import boto3
import logging
import traceback
from botocore.exceptions import ClientError
from urllib.parse import unquote_plus

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb = boto3.resource('dynamodb')

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

    # Extract dynamodb_table_name from environment variables or other configurations
    dynamodb_table_name = os.environ["DYNAMODB_TABLE_NAME"]
    processedFiles = event['processedFiles']
    errors = []  # Initialize the errors list

    try:
        # Extract the 'document_id' from the original S3 event
        # This assumes that the `errorInfo` key in the event contains the details of the error
        # And the original S3 event is still in the main body of the event

        processedFiles = processedFiles.replace("public/","")

        # Mark the document as failed in DynamoDB
        mark_document_as_failed(processedFiles, dynamodb_table_name)

    except (ClientError, Exception) as e:
        error_type = 'ClientError' if isinstance(e, ClientError) else 'UnexpectedError'
        errors.append({
            'statusCode': 500,
            'type': error_type,
            'message': str(e)
        })
        logger.error(traceback.format_exc())
        logger.error(f"{error_type} error for document with ID: {document_id}. Error: {str(e)}")

    if errors:
        return {
            'statusCode': 500,
            'errors': errors
        }
    else:
        return {
            'statusCode': 200,
            'message': f"Marked document with ID {document_id} as FAILED in {dynamodb_table_name}.",
            'document_id': document_id
        }