# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
from langchain.llms.bedrock import Bedrock
import boto3
from langchain.callbacks.manager import CallbackManager
from handlers import MyStdOutCallbackHandler, MyStdOutQuestionCallbackHandler

AWS_INTERNAL = os.environ["AWS_INTERNAL"]


def get_model_args(model_id):   
    if model_id == "Amazon-Titan-Large":
        question_llm_model_args = { 
            "maxTokenCount": 1000, #4096
            "stopSequences": [], 
            "temperature": 0.0, 
            "topP": 0.9 
        }

        qa_llm_model_args = { 
            "maxTokenCount": 1500, 
            "stopSequences": [], 
            "temperature": 0.0, 
            "topP": 0.9 
        }
    elif model_id == "Anthropic-Claude-V2":
        question_llm_model_args = { 
            "max_tokens_to_sample": 1000, 
            "stop_sequences": [], 
            "temperature": 0.0, 
            "top_p": 0.9 
        }

        qa_llm_model_args = { 
            "max_tokens_to_sample": 1500, 
            "stop_sequences": [], 
            "temperature": 0.0, 
            "top_p": 0.9 
        }
    elif model_id == "AI21-Jurassic-2-Ultra":
        question_llm_model_args = { 
            "maxTokens": 1000, 
            "stopSequences": [], 
            "temperature": 0.0, 
            "topP": 0.9 
        }

        qa_llm_model_args = { 
            "maxTokens": 1500, #8191
            "stopSequences": [], 
            "temperature": 0.0, 
            "topP": 0.9 
        }
    else:
        raise NameError("Invalid Model Specified")
    
    return question_llm_model_args, qa_llm_model_args


def get_model_id(model_id):
    if model_id == "Amazon-Titan-Large":
        return "amazon.titan-tg1-large"
    elif model_id == "Anthropic-Claude-V2":
        return "anthropic.claude-v2"
    elif model_id == "AI21-Jurassic-2-Ultra":
        return "ai21.j2-ultra"
    else:
        raise NameError("Invalid Model Specified")

def get_bedrock_llms(model_id):
    manager_q = CallbackManager([MyStdOutQuestionCallbackHandler()])
    manager = CallbackManager([MyStdOutCallbackHandler()])
    modelId = get_model_id(model_id)
    question_llm_model_args, qa_llm_model_args = get_model_args(model_id)
    
    llm_q = Bedrock(callback_manager=manager_q,model_id= modelId, model_kwargs=question_llm_model_args)
    llm = Bedrock(callback_manager=manager,model_id= modelId, model_kwargs=qa_llm_model_args)

    if AWS_INTERNAL.upper() == "TRUE":
        bedrock_client = get_bedrock_client()
        if bedrock_client:
            llm_q.client=bedrock_client
        if bedrock_client:
            llm.client=bedrock_client
    
    return llm_q, llm


def get_bedrock_client():
    bedrock_session = boto3.Session(
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            aws_session_token=os.getenv('AWS_SESSION_TOKEN')
        )
    return bedrock_session.client(service_name="bedrock-runtime", region=os.environ['AWS_REGION'])