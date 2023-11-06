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
# --  Linkedin:      https://www.linkedin.com/in/ztanruan
# --  Date:          04/11/2023
# --  Purpose:       Embeddings Task
# --  Version:       0.1.0
# --  Disclaimer:    This code is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

import json
import os
import logging
import traceback
from botocore.exceptions import ClientError
import boto3
import zipfile
from langchain.embeddings.sagemaker_endpoint import EmbeddingsContentHandler
from langchain.llms.sagemaker_endpoint import ContentHandlerBase
from langchain.vectorstores.faiss import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import SagemakerEndpointEmbeddings
from typing import Dict, List
import botocore

# Initial Setup
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Environment Variables
S3_BUCKET_NAME = os.environ['S3_BUCKET_NAME']
S3_FILE_KEY = os.environ['S3_FILE_KEY']
DOCUMENT_ID = os.environ['DOCUMENT_ID']
DYNAMODB_TABLE_NAME = os.environ['DYNAMODB_TABLE_NAME']
TEMP_BUCKET_NAME = os.environ['TEMP_BUCKET_NAME']
EMBEDDINGS_ENDPOINT_NAME = os.environ['EMBEDDINGS_ENDPOINT_NAME']
OUTPUT_BUCKET_NAME = os.environ["OUTPUT_BUCKET_NAME"]

config = botocore.config.Config(
    read_timeout=1800,
    connect_timeout=1800,
    retries={"max_attempts": 0}
)

class Document:
    def __init__(self, page_content, metadata):
        self.page_content = page_content
        self.metadata = metadata

class ContentHandler(EmbeddingsContentHandler):
    content_type = "application/json"
    accepts = "application/json"

    def transform_input(self, prompts: List[str], model_kwargs: Dict) -> bytes:
        return json.dumps({"inputs": prompts}).encode('utf-8')

    def transform_output(self, output: bytes) -> List[List[float]]:
        return json.loads(output.read().decode("utf-8"))["vectors"]

def mark_document_as_failed(document_id, table_name):
    table = dynamodb.Table(table_name)
    return table.update_item(
        Key={'id': document_id},
        UpdateExpression="SET document_status = :status",
        ExpressionAttributeValues={':status': "Failed"}
    )

def upload_directory_to_s3(directory_path, bucket_name, document_name):
    for filename in os.listdir(directory_path):
        s3.upload_file(os.path.join(directory_path, filename), bucket_name, f'vectors/{document_name}/{filename}')

def zip_folder(folder_path, output_path):
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(folder_path):
            for file in files:
                zipf.write(os.path.join(root, file), os.path.relpath(os.path.join(root, file), folder_path))

def create_vector(text, key_name):
    
    embeddings = SagemakerEndpointEmbeddings(endpoint_name=EMBEDDINGS_ENDPOINT_NAME, region_name=os.environ['AWS_REGION'], content_handler=ContentHandler())
    texts_objects = [Document(d['page_content'], d['metadata']) for d in text]
    
    vectorstore = None
    for i in range(0, len(texts_objects), 20):
        if vectorstore is None:
            vectorstore = FAISS.from_documents(texts_objects[i : i + 20], embeddings)
        else:
            vectorstore.add_documents(texts_objects[i : i + 20])
           
    output_path = f'/tmp/{key_name}-vectorstore.pkl'
    vectorstore.save_local(output_path)
   
    output_zip_path = output_path + ".zip"
    zip_folder(output_path, output_zip_path)
    
    zip_s3_key = f"s3://{OUTPUT_BUCKET_NAME}/{os.path.basename(output_zip_path)}"
    s3.upload_file(output_zip_path, OUTPUT_BUCKET_NAME, os.path.basename(output_zip_path))
    
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    table.update_item(
        Key={'id': DOCUMENT_ID},
        UpdateExpression="SET document_status = :status, vector = :vector",
        ExpressionAttributeValues={':status': "Completed", ':vector': zip_s3_key}
    )

if __name__ == "__main__":
    logger.info("Starting ECS task script...")
    try:
        document_name = os.path.splitext(S3_FILE_KEY.replace("documents/", ""))[0]
        document_content = json.loads(s3.get_object(Bucket=S3_BUCKET_NAME, Key=S3_FILE_KEY)['Body'].read().decode('utf-8'))
        print(document_content)
        print(document_name)
        create_vector(document_content, document_name)

    except Exception as e:  # Catching all exceptions
        mark_document_as_failed(DOCUMENT_ID, DYNAMODB_TABLE_NAME)
        error_type = 'ClientError' if isinstance(e, ClientError) else 'UnexpectedError'
        logger.error(traceback.format_exc())
        logger.error(f"{error_type} error for bucket: {S3_BUCKET_NAME}, key: {S3_FILE_KEY}. Error: {str(e)}")
        logger.error(f"Encountered errors: {str(e)}")
    else:
        logger.info(f"Processed files from bucket: {S3_BUCKET_NAME}")

    logger.info("ECS task script completed.")