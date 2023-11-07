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
# --  Purpose:       Handlers errors
# --  Version:       0.1.0
# --  Disclaimer:    This code is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

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
            ':status': "Failed"
        }
    )
    return response

def lambda_handler(event, context):

    # Extract dynamodb_table_name from environment variables or other configurations
    DOCUMENT_TABLE_NAME = os.environ["DOCUMENT_TABLE_NAME"]
    processedFiles = event['processedFiles']
    errors = []  # Initialize the errors list

    try:
        # Extract the 'document_id' from the original S3 event
        # This assumes that the `errorInfo` key in the event contains the details of the error
        # And the original S3 event is still in the main body of the event

        processedFiles = processedFiles.replace("public/","")

        # Mark the document as failed in DynamoDB
        mark_document_as_failed(processedFiles, DOCUMENT_TABLE_NAME)

    except (ClientError, Exception) as e:
        error_type = 'ClientError' if isinstance(e, ClientError) else 'UnexpectedError'
        errors.append({
            'statusCode': 500,
            'type': error_type,
            'message': str(e)
        })
        logger.error(traceback.format_exc())
        logger.error(f"{error_type} error for document with ID: {processedFiles}. Error: {str(e)}")

    if errors:
        return {
            'statusCode': 500,
            'errors': errors
        }
    else:
        return {
            'statusCode': 200,
            'message': f"Marked document with ID {processedFiles} as Failed in {DOCUMENT_TABLE_NAME}.",
            'document_id': processedFiles
        }