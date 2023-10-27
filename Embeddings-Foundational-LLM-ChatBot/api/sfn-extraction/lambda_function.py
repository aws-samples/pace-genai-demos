# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import boto3
import os
import json
import logging
from urllib.parse import unquote_plus
from botocore.exceptions import ClientError
from langchain.document_loaders import AmazonTextractPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
textract_client = boto3.client('textract')

def mark_document_as_failed(document_id, dynamodb_table_name):
    table = dynamodb.Table(dynamodb_table_name)
    response = table.update_item(
        Key={'id': document_id},
        UpdateExpression="SET document_status = :status",
        ExpressionAttributeValues={':status': "FAILED"}
    )
    return response

def upload_to_s3(bucket_name, document, document_name):
    key = f"documents/{document_name}.json"
    s3.put_object(Bucket=bucket_name, Key=key, Body=document)

def lambda_handler(event, context):
    """Process uploaded files in an S3 bucket using Amazon Textract."""
    
    temporary_bucket_name = os.environ["TEMPORARY_BUCKET_NAME"]
    dynamodb_table_name = os.environ["DYNAMODB_TABLE_NAME"]
    sagemaker_endpoint_name = os.environ["EMBEDDINGS_SAGEMAKER_ENDPOINT_NAME"]
    document_output_bucket_name = os.environ["S3_OUTPUT_ASSETS_BUCKET_NAME"]

    processed_files = []
    errors = []

    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])
        event_time = record['eventTime']
    
        try:

            _, file_extension = os.path.splitext(key)
            clean_file_extension = file_extension.lstrip(".")
            tmpKey = key.replace("public/", "")
            document_name = os.path.splitext(tmpKey)[0]
            item = {
                'id': tmpKey,
                'documentName': document_name,
                'document_status': "PROCESSING",
                'uploadDate': event_time,
                'type': clean_file_extension,
                'vector': "",         
            }
            table = dynamodb.Table(dynamodb_table_name)
            table.put_item(Item=item)

            file_path = f"s3://{bucket}/{key}"
            loader = AmazonTextractPDFLoader(file_path, client=textract_client)
            raw_documents= loader.load()
            
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=512, chunk_overlap=100)
            documents = text_splitter.split_documents(raw_documents)
            
            logger.info("Processed documents: %s", documents)
            logger.info("Raw documents length: %d", len(raw_documents))

            documents_as_dicts = [{"page_content": doc.page_content, "metadata": doc.metadata} for doc in documents]
            serialized_data = json.dumps(documents_as_dicts).encode('utf-8')
            upload_to_s3(temporary_bucket_name, serialized_data, document_name)
            processed_files.append(key)

            
        except (ClientError, Exception) as e:
            error_type = 'ClientError' if isinstance(e, ClientError) else 'UnexpectedError'
            mark_document_as_failed(key.replace("public/", ""), dynamodb_table_name)
            errors.append({
                'statusCode': 500,
                'type': error_type,
                'message': str(e),
                'bucketName': bucket,
                'key': key
            })
            logger.error(f"{error_type} for bucket: {bucket}, key: {key}. Error: {str(e)}")

    if errors:
        return {
            'statusCode': 500,
            'errors': errors,
            'processedFiles': processed_files
        }

    return {
        'statusCode': 200,
        'message': f"Processed files from bucket: {bucket}",
        'processedFiles': processed_files,
        'document_key': key,
        'output': {
            'bucket': temporary_bucket_name,
            'key': f"documents/{document_name}.json",
            'document_id': key.replace("public/", ""),
            'document_status': "PROCESSING",
        },
        'dynamodb_table_name': dynamodb_table_name,
        'temporary_bucket_name': temporary_bucket_name,
        'sagemaker_endpoint_name': sagemaker_endpoint_name,
        'document_output_bucket_name': document_output_bucket_name
    }
