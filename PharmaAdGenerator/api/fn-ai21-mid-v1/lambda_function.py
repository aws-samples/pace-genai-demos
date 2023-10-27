# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import os
import json

# Initialize the DynamoDB client
DYNAMO_DB_TABLE_NAME = os.environ.get("DYNAMO_DB_TABLE_NAME")

region = os.environ['AWS_REGION']
bedrock = boto3.client(
                service_name='bedrock-runtime',
                region_name=region,
                endpoint_url=f'https://bedrock-runtime.{region}.amazonaws.com')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(DYNAMO_DB_TABLE_NAME)


def get_country_language(country):
    if country == "France":
        return "french"
    elif country == "Mexico":
        return "spanish"
    elif country == "Italy":
        return "italian"
    elif country == "Germany":
        return "german"
    elif country == "Brazil":
        return "portuguese"
    else:
        return "english"
    
def get_document_by_id(primary_key_value):

    response = table.get_item(
        Key={
            "id": primary_key_value,
        },
    )
    if "Item" in response:
        return response["Item"]["textract_response"]
    
    else:
        return None
        
        
def complete(document, temperature, maxTokens):

    body = json.dumps({
        "prompt": document,
        "maxTokens": maxTokens,
        "temperature": temperature,
        "numResults": 1
    })

    modelId = 'ai21.j2-mid-v1'
    accept = 'application/json'
    contentType = 'application/json'

    response = bedrock.invoke_model(body=body, modelId=modelId, accept=accept, contentType=contentType)
    response_body = json.loads(response.get('body').read())
    print(response_body)
    return (response_body['completions'][0]["data"]["text"].lstrip())

def get_brand(document):

    document = document
    brand_name_prompt_template = f"""
    Question: Extract the brand name from the below product description
    Document: {document}
    Answer: The brand name is:
    """
    
    return complete(brand_name_prompt_template, 0.0, 4000)


def get_summary(fda_guideline, document, brand_name, language):

    product_description = document
    fda = fda_guideline
    brand_name = brand_name
    language = language

    if (fda == "Yes"):

        document_prompt_template = f"""
        Question: Pretend you are a marketing agent for {brand_name}. Generate a 200-word paragraph in {language} following FDA's prescription drug advertising about the product from {brand_name} using the below description and nothing else.
        Document: {document}
        Answer: Here is the description of the product  following FDA's prescription drug advertising: 
        """
        
    else:
        
        document_prompt_template = f"""
        Question: Pretend you are a marketing agent for {brand_name}. Generate a 200-word paragraph in {language} describing the benefits and why people should use the product from {brand_name} using the below description and nothing else.
        The description should be upbeat and make people feel like this product will make their life better. Be sure to include a description of any potential side effects or other warnings.
        End the description by instructing the reader to ask their doctor about the product.
        Document: {document}
        Answer: Here is the description of the product: 
        """

    return complete(document_prompt_template, 0.7, 4000)
        

def get_title(document_summary, brand_name, ad_language):

    summary = document_summary
    brand_name = brand_name
    language = ad_language

    title_prompt_template = f"""
    Question: Pretend you are a marketing agent for {brand_name}. Create a one-sentence headline in {language} about {brand_name} that includes the name "{brand_name}" and conveys good health and excitement using the below information.
    Document: {summary}
    Answer: The headline is:
    """
    return complete(title_prompt_template, 0.7, 4000)

    
# Lambda function handler
def lambda_handler(event, context):
    
    _ = context

    body = event.get("body", "{}")
    body = json.loads(body)

    document_id = body['document_id']['value']
    location = body['location']['value']
    fda_guideline = body['fda']['value']

    document = get_document_by_id(document_id)
    language = get_country_language(location)
    
    brandName = get_brand(document)
    adSummary = get_summary(fda_guideline, document, brandName, language)
    adTitle = get_title(adSummary, brandName, language)

    data = {
    'title':  adTitle,
    'summary': adSummary
    }
    
    return {
        'statusCode': 200,
        'body': json.dumps(data)
    }