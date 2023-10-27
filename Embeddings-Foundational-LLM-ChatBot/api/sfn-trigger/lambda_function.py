# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import boto3
import json
import os
import urllib.parse
import traceback
import logging
from botocore.exceptions import ClientError

s3 = boto3.client('s3')
stepfunctions = boto3.client('stepfunctions')

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    # Get the bucket name and file key from the event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')

    try:
        # Rename the file if it has spaces
        new_key = key.replace(" ", "")
        if new_key != key:
            s3.copy_object(Bucket=bucket, CopySource={'Bucket': bucket, 'Key': key}, Key=new_key)
            s3.delete_object(Bucket=bucket, Key=key)
            
            # Update the event with the new key
            event['Records'][0]['s3']['object']['key'] = new_key

        # Trigger the Step Function with the updated event
        state_machine_arn = os.environ['STATE_MACHINE_ARN']
        response = stepfunctions.start_execution(
            stateMachineArn=state_machine_arn,
            input=json.dumps(event)
        )

        return {
            'statusCode': 200,
            'message': f"Execution started on step function pipeline for document with ID {key}.",
            'key': key
        }

    except Exception as e:
        error_type = "ClientError" if isinstance(e, ClientError) else "UnexpectedError"
        logger.error(traceback.format_exc())
        logger.error(f"{error_type} error for triggering step function pipeline for document with ID: {key}. Error: {str(e)}")
        
        return {
            'statusCode': 500,
            'errors': [{
                'type': error_type,
                'message': str(e)
            }]
        }
