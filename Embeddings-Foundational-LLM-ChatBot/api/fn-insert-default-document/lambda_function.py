# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import os
import json
import boto3
import requests

dynamodb = boto3.resource('dynamodb')
dynamodb_table_name = os.environ["DYNAMODB_TABLE_NAME"]
s3_output_bucket = os.environ["S3_OUTPUT_ASSETS_BUCKET_NAME"]

def send_cfn_response(event, context, response_status, response_data=None):
    response_data = response_data or {}
    response_body = json.dumps({
        'Status': response_status,
        'Reason': 'See CloudWatch logs for details',
        'PhysicalResourceId': context.log_stream_name,
        'StackId': event['StackId'],
        'RequestId': event['RequestId'],
        'LogicalResourceId': event['LogicalResourceId'],
        'Data': response_data
    })
    
    headers = {
        'content-type': '',
        'content-length': str(len(response_body))
    }

    try:
        response = requests.put(event['ResponseURL'], data=response_body, headers=headers)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to send CloudFormation response: {e}")
        raise

def lambda_handler(event, context):

    try:  
        item = {
            'id': "aws-nltkV1-vectorstore.pdf",
            'documentName': "aws-nltkV1-vectorstore",
            'document_status': "COMPLETED",
            'uploadDate': "2023-10-09T00:30:37.128Z",
            'type': "pdf",
            'vector': f"s3://{s3_output_bucket}/aws-nltkV1-vectorstore.pkl.zip",       
        }
        table = dynamodb.Table(dynamodb_table_name)
        table.put_item(Item=item)

        send_cfn_response(event, context, 'SUCCESS', {'message': 'Record inserted'})

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Record inserted and CloudFormation notified'})
        }

    except Exception as e:
        print(f"Error: {e}")
        send_cfn_response(event, context, 'FAILED')
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Error occurred'})
        }




