# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# Permission is hereby granted, free of charge, to any person obtaining a copy of this
# software and associated documentation files (the "Software"), to deal in the Software
# without restriction, including without limitation the rights to use, copy, modify,
# merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# --
# --  Author:        Jin Tan Ruan
# --  Date:          04/11/2023
# --  Purpose:       Creates the embeddings for the document
# --  Version:       0.1.0
# --  Disclaimer:    This code is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

import boto3
import os

def lambda_handler(event, context):
    ecs_client = boto3.client('ecs')
    
    # Retrieve values from environment variables and the event
    CLUSTER_NAME = os.environ['CLUSTER_NAME']
    CONTAINER_NAME = os.environ['CONTAINER_NAME']
    TASK_DEFINITION = os.environ['TASK_DEFINITION']
    OUTPUT_BUCKET_NAME = os.environ['OUTPUT_BUCKET_NAME']

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
        cluster=CLUSTER_NAME,
        launchType=launch_type,
        taskDefinition=TASK_DEFINITION,
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
                'name': CONTAINER_NAME,
                'environment': [
                    {'name': 'S3_BUCKET_NAME', 'value': bucket},
                    {'name': 'S3_FILE_KEY', 'value': key},
                    {'name': 'OUTPUT_BUCKET_NAME', 'value': OUTPUT_BUCKET_NAME},

                    # Add other environment variables here
                    {'name': 'DOCUMENT_KEY', 'value': document_key},
                    {'name': 'DOCUMENT_ID', 'value': document_id},
                    {'name': 'DOCUMENT_STATUS', 'value': document_status},
                    {'name': 'DYNAMODB_TABLE_NAME', 'value': dynamodb_table_name},
                    {'name': 'TEMP_BUCKET_NAME', 'value': temporary_bucket_name},
                    {'name': 'EMBEDDINGS_ENDPOINT_NAME', 'value': sagemaker_endpoint_name}
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
        'document_output_bucket_name': OUTPUT_BUCKET_NAME

    }