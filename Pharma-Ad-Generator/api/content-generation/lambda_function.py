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
# --  Purpose:       Content Generation Handler
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
from botocore.exceptions import ClientError
from text_generation import text_generation
from image_generation import image_generation

# Constants
DYNAMO_DB_TABLE_NAME = os.environ.get("DYNAMO_DB_TABLE_NAME")
S3_INPUT_ASSETS_BUCKET_NAME = os.environ["S3_INPUT_ASSETS_BUCKET_NAME"]
S3_OUTPUT_ASSETS_BUCKET_NAME = os.environ["S3_OUTPUT_ASSETS_BUCKET_NAME"]
REGION = os.environ['AWS_REGION']

dynamodb_resource = boto3.resource("dynamodb")

def lambda_handler(event, context):

    _ = context
    
    try:
        
        type_generation = event.get("requestContent", {}).get("type_generation")
        
        body = event.get("body", "{}")
        body = json.loads(body)

        text_model_id = body['text_model_id']
        temperature = body["temperature"]

        image_model_id = body['image_model_id']
        style = body['style']
        strength = body["strength"] 

        document_id = body['document_id']['id']
        location = body['location']
        source_image = body['source_image']['value']

        type_generation = body["type_generation"]

        toneStyle =  body["toneStyle"]
        compliance = body["compliance"]
        audience = body["audience"]
        platform =  body["platform"]
        objectives =  body["objectives"]
        
        adTitle = ""
        adSummary = ""
        image_content = ""

        if type_generation == "0":

            text_content = text_generation(document_id, location, text_model_id, compliance, temperature, toneStyle, audience, platform, objectives)
            image_content = image_generation(location, style, image_model_id, source_image, strength)

            adTitle = text_content.get('title', '')
            adSummary = text_content.get('summary', '')

        elif type_generation == "1":
            text_content = text_generation(document_id, location, text_model_id, compliance, temperature, toneStyle, audience, platform, objectives)
            adTitle = text_content.get('title', '')
            adSummary = text_content.get('summary', '')

        else:
            image_content = image_generation(location, style, image_model_id, source_image, strength)

        data = {
            "type_generation": type_generation,
            "title": adTitle,
            "summary": adSummary,
            "image_content": image_content
        }

        return {
            'statusCode': 200,   
            'body': json.dumps(data), 
            'headers': {
                'Content-Type': 'application/json'
            }
        }
    
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal Server Error'}),
            'headers': {
                'Content-Type': 'application/json'
            }
        }