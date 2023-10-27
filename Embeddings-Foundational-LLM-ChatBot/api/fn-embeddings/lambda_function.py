# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import boto3
from urllib.parse import unquote_plus
import os
from sagemaker.huggingface.model import HuggingFaceModel

S3_EMBEDDING_MODEL_PACKAGE_NAME = os.environ["S3_EMBEDDING_MODEL_PACKAGE_NAME"]
SAGEMAKER_EXECUTION_ROLE = os.environ["SAGEMAKER_EXECUTION_ROLE"]

def lambda_handler(event, context):
    
    huggingface_model = HuggingFaceModel(
        model_data= "s3://" + S3_EMBEDDING_MODEL_PACKAGE_NAME + "/model.tar",       
        role= SAGEMAKER_EXECUTION_ROLE,               
        transformers_version="4.12",  
        pytorch_version="1.9",        
        py_version='py38',           
)

    # deploy the endpoint endpoint
    huggingface_model.deploy(
        endpoint_name="e5-largeV1",
        initial_instance_count=1,
        instance_type="ml.g5.2xlarge")
        
    return {
        'statusCode': 200,
        'body': json.dumps('Model deploy')
    }