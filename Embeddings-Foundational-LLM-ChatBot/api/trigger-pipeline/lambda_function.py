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
# --  Purpose:       Triggers the step function pipeline
# --  Version:       0.1.0
# --  Disclaimer:    This code is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

import boto3
import json
import os
import urllib.parse
import traceback
import logging
from botocore.exceptions import ClientError

s3 = boto3.client('s3')
stepfunctions = boto3.client('stepfunctions')

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    # Get the bucket name and file key from the event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')

    try:
        # Rename the file if it has spaces
        new_key = key.replace(" ", "")
        if new_key != key:
            s3.copy_object(Bucket=bucket, CopySource={'Bucket': bucket, 'Key': key}, Key=new_key)
            s3.delete_object(Bucket=bucket, Key=key)
            
            # Update the event with the new key
            event['Records'][0]['s3']['object']['key'] = new_key

        # Trigger the Step Function with the updated event
        STATE_MACHINE_ARN = os.environ['STATE_MACHINE_ARN']
        stepfunctions.start_execution(
            stateMachineArn=STATE_MACHINE_ARN,
            input=json.dumps(event)
        )

        return {
            'statusCode': 200,
            'message': f"Execution started on step function pipeline for document with ID {key}.",
            'key': key
        }

    except Exception as e:
        error_type = "ClientError" if isinstance(e, ClientError) else "UnexpectedError"
        logger.error(traceback.format_exc())
        logger.error(f"{error_type} error for triggering step function pipeline for document with ID: {key}. Error: {str(e)}")
        
        return {
            'statusCode': 500,
            'errors': [{
                'type': error_type,
                'message': str(e)
            }]
        }
