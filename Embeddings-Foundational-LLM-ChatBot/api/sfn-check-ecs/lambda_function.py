# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import boto3
import os

client = boto3.client('ecs')

def lambda_handler(event, context):
    task_arn = event['task_arn']
    response = client.describe_tasks(
        cluster=os.environ['ECS_CLUSTER_NAME'],
        tasks=[task_arn]
    )
    status = response['tasks'][0]['lastStatus']
    if status == 'STOPPED':
        return {
            'done': True,
            'task_arn': task_arn,

        }
    else:
        return {
            'done': False,
            'task_arn': task_arn,
        }