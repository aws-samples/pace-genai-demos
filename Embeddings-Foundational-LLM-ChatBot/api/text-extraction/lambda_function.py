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
# --  Purpose:       Extracts information from the documents
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
        ExpressionAttributeValues={':status': "Failed"}
    )
    return response

def upload_to_s3(bucket_name, document, document_name):
    key = f"documents/{document_name}.json"
    s3.put_object(Bucket=bucket_name, Key=key, Body=document)

def lambda_handler(event, context):
    """Process uploaded files in an S3 bucket using Amazon Textract."""
    
    TEMPORARY_BUCKET_NAME = os.environ["TEMPORARY_BUCKET_NAME"]
    DOCUMENT_TABLE_NAME = os.environ["DOCUMENT_TABLE_NAME"]
    EMBEDDINGS_ENDPOINT_NAME = os.environ["EMBEDDINGS_ENDPOINT_NAME"]
    OUTPUT_BUCKET_NAME = os.environ["OUTPUT_BUCKET_NAME"]
    AWS_REGION = os.environ['AWS_REGION']

    textract_client = boto3.client("textract", region_name=AWS_REGION)
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
                'document_status': "Processing",
                'uploadDate': event_time,
                'type': clean_file_extension,
                'vector': "",         
            }
            table = dynamodb.Table(DOCUMENT_TABLE_NAME)
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
            upload_to_s3(TEMPORARY_BUCKET_NAME, serialized_data, document_name)
            processed_files.append(key)
         
        except (ClientError, Exception) as e:
            error_type = 'ClientError' if isinstance(e, ClientError) else 'UnexpectedError'
            mark_document_as_failed(key.replace("public/", ""), DOCUMENT_TABLE_NAME)
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
            'bucket': TEMPORARY_BUCKET_NAME,
            'key': f"documents/{document_name}.json",
            'document_id': key.replace("public/", ""),
            'document_status': "Processing",
        },
        'dynamodb_table_name': DOCUMENT_TABLE_NAME,
        'temporary_bucket_name': TEMPORARY_BUCKET_NAME,
        'sagemaker_endpoint_name': EMBEDDINGS_ENDPOINT_NAME,
        'document_output_bucket_name': OUTPUT_BUCKET_NAME
    }
