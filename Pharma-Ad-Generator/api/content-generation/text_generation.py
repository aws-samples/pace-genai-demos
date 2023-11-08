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
# --  Purpose:       Text Generation
# --  Version:       0.1.0
# --  Disclaimer:    This code is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

import json
from database_helpers import get_document_by_id
from resources import bedrock


def get_country_language(country):
    language_map = {
        "France": "french",
        "Mexico": "spanish",
        "Italy": "italian",
        "Germany": "german",
        "Brazil": "portuguese",
        "Colombia": "spanish",
        "Chile": "spanish",
    }
    return language_map.get(country, "english")


def text_generation(document_id, location, model_id, compliance, temperature, toneStyle, audience, platform, objectives):

    document = get_document_by_id(document_id)
    language = get_country_language(location)
    brand_name = get_brand(document, model_id, temperature)
    adSummary = get_summary(compliance, document, brand_name, language, model_id, temperature, toneStyle, audience, platform, objectives)
    adTitle = get_title(adSummary, brand_name, language, model_id, temperature, toneStyle, audience, platform, objectives)

    data = {'title': adTitle, 'summary': adSummary}
    return data 

def get_brand(document, model_id, temperature):
    
    if model_id.startswith("anthropic"):
        
        prompt = f"""
            \n\nHuman: Extract the brand name from this description.
            <description>{document}</description>
            \n\nAssistant: The brand name is: """
            
    else:
        
        prompt = f"""
            Question: Extract the brand name from the description
            Document: {document}
            Answer: The brand name is:"""

    return complete(prompt, temperature, 4000, model_id)
    

def get_title(adSummary, brand_name, language, model_id, temperature, toneStyle, audience, platform, objectives):
    
    if model_id.startswith("anthropic"):
    
        prompt = f"""
            \n\nHuman: "You are a Marketing Specialist with expertise in writing compliant marketing content.
            You are responsible for generating marketing content for a therapeutic product named {brand_name} with the objective of {objectives}. 
            This therapeutic product has the following approved uses: "{adSummary}".
            Create a one-sentence headline for in {language}, specifically tailored for a {platform} post that will appeal to {audience}.
            Ensure the headline adheres to a {toneStyle} tone, incorporates the name of the therapeutic product, and encapsulates feelings of good health and enthusiasm."

            \n\nAssistant: To ensure I'm on the right track, you're asking for a one-sentence headline in {language} that highlights {brand_name}, in line with the 
            objectives of {objectives}. This headline aims to radiate health and enthusiasm and is intended for {audience} on {platform}, 
            following the typical style conventions of {platform} and written in a {toneStyle} tone. 
            I will not include or reference XML tags or directly quote the content you provided. 
            My response will be strictly the headline itself. Have I understood your requirements correctly?

            \n\nHuman: Yes, that's precisely what I'm looking for. Only use the information from the document to write the headline. 
            Avoid including any tags or directly lifting content from the document in the headline.

            \n\nAssistant: Here is the headline:"""

    else:

        prompt = f"""
            Question: As a Marketing Specialist specializing in compliant marketing content, your task is as follows: 
            Based on the provided ad summary, generate a headline for the therapeutic product named {brand_name} with the intent of {objectives} in {language}. 
            The headline should be a single sentence in {language}, tailored for a post on {platform}, targeting {audience}. The tone must be {toneStyle}, 
            mention the therapeutic product, and evoke a sense of health and excitement. Make sure it aligns with the typical style conventions of {platform}.

            Answer: To verify my understanding: I'm to create a one-liner headline in {language} spotlighting {brand_name}, 
            aligning with the objective of {objectives}, and exuding health and enthusiasm. 
            This headline is created for {audience} on {platform}, adhering to the standard style of {platform}, and will carry a {toneStyle} tone. 
            I'll avoid referencing XML tags and won't use the quoted content verbatim. Only the headline will be returned and remove double quotes on the headline. 
            Exclude any quotations symbols, and provide only the text for the headline. 
            Have I understood your requirements correctly?

            Answer: Your headline is:"""


    return complete(prompt, temperature, 4000, model_id)


def get_summary(compliance, document, brand_name, language, model_id, temperature, toneStyle, audience, platform, objectives):
    
    document = ' '.join([line.strip() for line in document.splitlines()])

    if compliance == "None/Other":

        if model_id.startswith("anthropic"):

            prompt = f"""

                \n\nHuman: "You are a Marketing Specialist with a focus on writing compliant marketing content. 
                You are tasked with creating marketing content for a therapeutic product named {brand_name} with the objective of {objectives}. 
                I will provide a description of the therapeutic product between <description></description> tags. 
                Based on this description create a post in 4 sentences in {language} for a {platform} post targeting {audience}. 
                The content should be written in a {toneStyle} tone. Describe the product benefits, reasons people should consider using it, and detail any potential side effects or warnings. 
                Conclude with an encouragement for readers to consult their doctor about the product. Do not include any on these instruction, ask for feedback, include XML tags, or reproduce content verbatim.
                
                <description>
                {document}
                </description>                    

                \n\nAssistant: Here's the description for the product: """
            
        else:

            prompt = f"""

                Question: As a Marketing Specialist focusing on compliant marketing content, you have the following task: 
                For the therapeutic product named {brand_name} with the goal of {objectives}, I will supply a product description enclosed within <description></description> tags. 
                From this, devise a post in 4 sentences in {language} for a {platform} post targeting {audience}.  
                The write-up should exude a {toneStyle} tone. Elaborate on the product's advantages, why it's a viable choice, and any possible side effects or cautions. 
                End by urging readers to discuss the product with their physician. Make sure the content aligns with the typical style conventions of {platform}.

                <description>
                {document}
                </description> 

                Answer: Here is the drug ad description of the product: """


    else:
            
        if model_id.startswith("anthropic"):

            prompt = f"""

                \n\nHuman: "You are a Marketing Specialist with a focus on writing compliant marketing content. 
                You are tasked with creating marketing content for a therapeutic product named {brand_name} with the objective of {objectives}. 
                I will provide a description of the therapeutic product between <description></description> tags. 
                Based on this description, create a post in 4 sentences in {language} for a {platform} post targeting {audience}. 
                The content should be written in a {toneStyle} tone, adhere to {compliance} rules, and be tailored to {platform}'s style. 
                Describe the product benefits, reasons people should consider using it, and detail any potential side effects or warnings. 
                Conclude with an encouragement for readers to consult their doctor about the product. Do not include any on these instruction, ask for feedback, include XML tags, or reproduce content verbatim.

                <description>
                {document}
                </description>                    

                \n\nAssistant: Here is your drug ad, tailored to {platform}'s style, in accordance with {compliance} rules:"""
                    
        else:           
                
            prompt = f"""

                Question: You are a Marketing Specialist with a focus on writing compliant marketing content. 
                For the therapeutic product {brand_name}, create a post in 4 sentences in {language} for {platform} targeting {audience}. 
                This post should align with {compliance} rules and should be written using the information provided in the description below and nothing else. 
                Ensure the tone of the post is {toneStyle}.
                    
                Document: {document}
                    
                Answer: Here is your drug ad, tailored to {platform}'s style, in accordance with {compliance} rules:"""
                
    return complete(prompt, temperature, 4000, model_id)


def invoke_model(body, model_id):
    response = bedrock.invoke_model(body=body, modelId=model_id, accept='application/json', contentType='application/json')
    return response


def temperature_map(temperature):
    temp_dict = {
        "Low": 0.0,
        "Medium": 0.1,
        "High": 0.2
    }
    return temp_dict.get(temperature, None)

def complete(document, temperature, model_max_token, model_id):
   
    body_dict = {
        "prompt": document,
        "temperature": temperature_map(temperature)
    }
    
    if model_id.startswith("anthropic"):

        body_dict["max_tokens_to_sample"] = int(model_max_token)
        body_dict["stop_sequences"] = ["Human", "Question", "Customer", "Guru"]
        modelId = model_id
        
    else:
        
        body_dict["maxTokens"] = model_max_token
        body_dict["numResults"] = 1
        modelId = model_id

    # Convert the dictionary to a JSON string
    body = json.dumps(body_dict)

    response = invoke_model(body, modelId)  # I assume invoke_model is defined elsewhere in your code
    response_body = json.loads(response.get('body').read())

    if model_id.startswith("anthropic"):
        return response_body.get('completion')
    return response_body['completions'][0]["data"]["text"].lstrip()