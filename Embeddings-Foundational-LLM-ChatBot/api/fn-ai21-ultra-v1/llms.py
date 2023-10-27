# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import os
import json
from typing import Any, Dict, Generic, List, Mapping, Optional, TypeVar, Union
from langchain.llms.base import LLM
from langchain.llms import AmazonAPIGateway
from langchain.llms.sagemaker_endpoint import LLMContentHandler 
from langchain.callbacks.manager import CallbackManagerForLLMRun
import requests
from pydantic import Extra
import boto3

secret_mgr_client = boto3.client('secretsmanager')
secret = secret_mgr_client.get_secret_value(SecretId="APIEndpointKey")
secret_dict = json.loads(secret['SecretString'])
API_KEY = secret_dict['apiKey']

LLM_SAGEMAKER_ENDPOINT = os.environ["LLM_SAGEMAKER_ENDPOINT"]
AWS_REGION = os.environ["AWS_REGION"]

class ContentHandlerAmazonAPIGateway:
    """Adapter class to prepare the inputs from Langchain to a format
    that LLM model expects. Also, provides helper function to extract
    the generated text from the model response."""

    @classmethod
    def transform_input(
        cls, prompt: str, model_kwargs: Dict[str, Any]
    ) -> Dict[str, Any]:
        return {"prompt": prompt, "parameters": model_kwargs}

    @classmethod
    def transform_output(cls, response: Any) -> str:
        return response.json()[0]["generated_text"]


class AmazonAPIGateway(LLM):
    api_url: str = LLM_SAGEMAKER_ENDPOINT
    model_kwargs = {"temperature": 0.7, "maxTokens": 2048, "numResults": 1}
    headers = {"Accept": "application/json", "x-api-key": API_KEY}
    content_handler: ContentHandlerAmazonAPIGateway = ContentHandlerAmazonAPIGateway()
    
    @property
    def _llm_type(self) -> str:
        return "amazon_api_gateway"

    def _call(self, prompt: str, stop: Optional[List[str]] = None) -> str:
        if stop is not None:
            raise ValueError("stop kwargs are not permitted.")
            
        print(self.model_kwargs)
        payload = self.content_handler.transform_input(prompt, self.model_kwargs)
        
        headers = {
        "Accept": "application/json",
        "x-api-key": API_KEY,
        }
        
        print(payload)
        response = requests.post(LLM_SAGEMAKER_ENDPOINT, headers=self.headers, json=payload)
        generated_text = response.json()
        return (generated_text['completions'][0]["data"]["text"].lstrip())
  
    @property
    def _identifying_params(self) -> Mapping[str, Any]:
        """Get the identifying parameters."""
        _model_kwargs = self.model_kwargs or {}
        return {
            **{"endpoint_name": self.api_url},
            **{"model_kwargs": _model_kwargs},
        }
