# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import os
import json
from PIL import Image
from io import BytesIO
import base64 


S3_INPUT_ASSETS_BUCKET_NAME = os.environ["S3_INPUT_ASSETS_BUCKET_NAME"]
region = os.environ['AWS_REGION']
bedrock = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                endpoint_url=f'https://bedrock-runtime.{region}.amazonaws.com')


def image_generation(source_image, image_prompt, style, location):

    # Create an S3 client
    s3 = boto3.client('s3')
    response = s3.get_object(Bucket=S3_INPUT_ASSETS_BUCKET_NAME, Key="public/reference-images/"+source_image)
    image_data = response['Body'].read()

    # Now use this image data with PIL's Image.open method
    with Image.open(BytesIO(image_data)) as init_image:
        init_image = init_image.resize((768, 448))
        buffer = BytesIO()
        init_image.save(buffer, format="PNG")
        init_image_bytestring = base64.b64encode(buffer.getvalue()).decode()

    json_obj = {
            "height": 448,
            "width": 768,
            "text_prompts": [
                {"text": image_prompt, "weight": 1},
                {"text": "deformed, low quality, bad anatomy, bad hands, three hands, three legs, bad arms, missing legs, missing arms, poorly drawn face, bad face, fused face, cloned face, worst face, three crus, extra crus, fused crus, worst feet, three feet, fused feet, fused thigh, three thigh, fused thigh, extra thigh, worst thigh, missing fingers, extra fingers, ugly fingers, long fingers, horn, extra eyes, huge eyes, 2girl, amputation, disconnected limbs, poorly rendered face, bad composition, mutated body parts, blurry image, disfigured, oversaturated, deformed body features", "weight": -1},
            ],
            "steps":100,
            "init_image": init_image_bytestring,
            "style_preset": style.lower(),
        }
    
    body = json.dumps(json_obj)

    modelId = 'stability.stable-diffusion-xl-v0'
    accept = 'application/json'
    contentType = 'application/json'

    response = bedrock.invoke_model(body=body, modelId=modelId, accept=accept, contentType=contentType)
    response_body = json.loads(response.get('body').read())
    return (response_body.get('artifacts'))

# Lambda function handler
def lambda_handler(event, context):
    _ = context
  
    body = event.get("body", "{}")
    body = json.loads(body)

    location = body['location']['value']
    style = body['style']['value']
    source_image = body['source_image']['value']

    image_prompt = f" Modify the background location to {location}" + f" Clearly located in {location}."
    new_image = image_generation(source_image, image_prompt, style, location)

    return {
        'statusCode': 200,
        'body': json.dumps(new_image)
    }
