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
# --  Purpose:       Inserts default document
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

dynamodb = boto3.resource('dynamodb')
s3_client = boto3.client('s3')

def lambda_handler(event, context):

    DOCUMENT_TABLE_NAME = os.environ["DOCUMENT_TABLE_NAME"]
    OUTPUT_BUCKET_NAME = os.environ["OUTPUT_BUCKET_NAME"]

    for record in event['Records']:
        source_bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        event_time = event['Records'][0]['eventTime']

        try:  
            if key.endswith(".pkl.zip"):
                # Copy the object to the new bucket
                copy_source = {'Bucket': source_bucket, 'Key': key}
                s3_client.copy_object(CopySource=copy_source, Bucket=OUTPUT_BUCKET_NAME, Key=key)

                item = {
                    'id': key.replace(".pkl.zip", ".pdf"),
                    'documentName': key.replace(".pkl.zip", ""),
                    'document_status': "Completed",
                    'uploadDate':  event_time,
                    'type': "pdf",
                    'vector': f"s3://{source_bucket}/{key}",       
                }

                # Write the file key to DynamoDB
                table = dynamodb.Table(DOCUMENT_TABLE_NAME)
                table.put_item(Item=item)

        except Exception as e:
            print(f"Error copying {key} to {OUTPUT_BUCKET_NAME}. Error: {e}")



