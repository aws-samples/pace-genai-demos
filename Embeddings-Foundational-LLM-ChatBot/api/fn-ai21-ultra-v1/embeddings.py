# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

from typing import Dict, List
import json
import os

from langchain.embeddings import SagemakerEndpointEmbeddings
from langchain.embeddings.sagemaker_endpoint import EmbeddingsContentHandler

AWS_REGION = os.environ["AWS_REGION"]
EMBEDDINGS_SAGEMAKER_ENDPOINT = os.environ["EMBEDDINGS_SAGEMAKER_ENDPOINT"]

class GPT_J_ContentHandler(EmbeddingsContentHandler):
    content_type = "application/json"
    accepts = "application/json"

    def transform_input(self, prompts: List[str], model_kwargs: Dict) -> bytes:
        input_str = json.dumps({"text_inputs": prompts})
        return input_str.encode("utf-8")

    def transform_output(self, output: bytes) -> List[List[float]]:
        response_json = json.loads(output.read().decode("utf-8"))
        return response_json["embedding"]
    
class E5_ContentHandler(EmbeddingsContentHandler):
    content_type = "application/json"
    accepts = "application/json"

    def transform_input(self, prompts: List[str], model_kwargs: Dict) -> bytes:
        input_str = json.dumps({"inputs": prompts})
        return input_str.encode("utf-8")

    def transform_output(self, output: bytes) -> List[List[float]]:
        response_json = json.loads(output.read().decode("utf-8"))
        # return [response_json["vectors"]]
        return response_json["vectors"]


def get_sagemaker_embeddings():
    return SagemakerEndpointEmbeddings(
        endpoint_name=EMBEDDINGS_SAGEMAKER_ENDPOINT,
        region_name=AWS_REGION,
        content_handler=E5_ContentHandler()
    )
