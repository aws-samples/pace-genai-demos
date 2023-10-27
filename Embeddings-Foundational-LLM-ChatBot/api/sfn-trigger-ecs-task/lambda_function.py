# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import boto3
import os

def lambda_handler(event, context):
    ecs_client = boto3.client('ecs')
    
    # Retrieve values from environment variables and the event
    cluster_name = os.environ['CLUSTER_NAME']
    task_definition_name = os.environ['TASK_DEFINITION']
    document_output_bucket_name = os.environ['S3_OUTPUT_ASSETS_BUCKET_NAME']
    bucket = event['output']['bucket']
    key = event['output']['key']
    document_key = event['document_key']
    document_id = event['output']['document_id']
    document_status = event['output']['document_status']
    dynamodb_table_name = event['dynamodb_table_name']
    temporary_bucket_name = event['temporary_bucket_name']
    sagemaker_endpoint_name = event['sagemaker_endpoint_name']

    launch_type = 'FARGATE'
    
    # Assuming your VPC has at least 2 public subnets.
    # Adjust as needed if you're using private subnets or have a different configuration.
    subnet_list = [os.environ['SUBNET_1'], os.environ['SUBNET_2']]

    response = ecs_client.run_task(
        cluster=cluster_name,
        launchType=launch_type,
        taskDefinition=task_definition_name,
        count=1,
        platformVersion='LATEST',
        networkConfiguration={
            'awsvpcConfiguration': {
                'subnets': subnet_list,
                'assignPublicIp': 'ENABLED',
            }
        },
        overrides={
            'containerOverrides': [{
                'name': 'Container',  # This should match the container name in your task definition
                'environment': [
                    {'name': 'S3_BUCKET_NAME', 'value': bucket},
                    {'name': 'S3_FILE_KEY', 'value': key},
                    {'name': 'S3_OUTPUT_ASSETS_BUCKET_NAME', 'value': document_output_bucket_name},

                    # Add other environment variables here
                    {'name': 'DOCUMENT_KEY', 'value': document_key},
                    {'name': 'DOCUMENT_ID', 'value': document_id},
                    {'name': 'DOCUMENT_STATUS', 'value': document_status},
                    {'name': 'DYNAMODB_TABLE_NAME', 'value': dynamodb_table_name},
                    {'name': 'TEMP_BUCKET_NAME', 'value': temporary_bucket_name},
                    {'name': 'SAGEMAKER_ENDPOINT_NAME', 'value': sagemaker_endpoint_name}
                    ]
                }]
            }
        )
        
    task_arn = response['tasks'][0]['taskArn']
        
    return {
        'statusCode': 200,
        'body': "ECS tasks started.",
        'taskArn': task_arn,
        'output': {
            'bucket': bucket,
            'key': key,
            'document_key': document_key,
            'document_id': document_id,
            'document_status': document_status,
        },
        'temporary_bucket_name': temporary_bucket_name,
        'dynamodb_table_name': dynamodb_table_name,
        'sagemaker_endpoint_name': sagemaker_endpoint_name,
        'task_arn': task_arn,
        'document_output_bucket_name': document_output_bucket_name

    }