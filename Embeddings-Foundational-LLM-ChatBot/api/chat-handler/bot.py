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
# --  Purpose:       Model Arguments
# --  Version:       0.1.0
# --  Disclaimer:    This code is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

import pathlib
import os
import uuid
import zipfile
import pickle
import boto3

from langchain.llms.bedrock import Bedrock
from langchain.chains.llm import LLMChain
from langchain.chains import ConversationalRetrievalChain
from langchain.chains.question_answering import load_qa_chain
from langchain.memory import ConversationBufferMemory
from langchain.callbacks.manager import CallbackManager
from langchain.vectorstores.faiss import FAISS
from embeddings import get_sagemaker_embeddings
from handlers import MyStdOutCallbackHandler
from prompts import get_document_prompt, get_question_prompt

CONTEXT_TABLE_NAME = os.environ["CONTEXT_TABLE_NAME"]
S3_ASSETS_BUCKET_NAME = os.environ["S3_ASSETS_BUCKET_NAME"]
AWS_INTERNAL = os.environ["AWS_INTERNAL"]

def get_model_args(model_id):   

    if model_id.startswith("anthropic"):

        question_llm_model_args = { 
            "max_tokens_to_sample": 7000, 
            "stop_sequences": [], 
            "temperature": 0.2, 
            "top_p": 0.9,
        }

        qa_llm_model_args = { 
            "max_tokens_to_sample": 7000, 
            "stop_sequences": ["Human", "Question", "Customer", "Guru"],
            "temperature": 0.2, 
            "top_p": 0.9,
        }

    else:

        question_llm_model_args = { 
            "maxTokens": 7000, 
            "stopSequences": [], 
            "temperature": 0.7,
            "numResults": 1,
        }

        qa_llm_model_args = { 
            "maxTokens": 7000, 
            "stopSequences": ["\n\nQuestion"], 
            "temperature": 0.7, 
            "numResults": 1,
       
        }
    
    return question_llm_model_args, qa_llm_model_args


def load_database(vectorstore_key):
    """ Load the database of knowledge we want to query off of.
    """

    assert (vectorstore_key.endswith(".zip"))
    local_zip = f"/tmp/{vectorstore_key}"
    local_dir = local_zip[:-4]  # remove .zip

    # Download
    print(f"Downloading from s3://{S3_ASSETS_BUCKET_NAME}/{vectorstore_key}")
    bucket = boto3.resource("s3").Bucket(S3_ASSETS_BUCKET_NAME)
    bucket.download_file(vectorstore_key, local_zip)

    # Unzip
    print(f"Expanding {local_zip}")
    pathlib.Path(local_dir).mkdir(exist_ok=True)
    with zipfile.ZipFile(local_zip, "r") as zf:
        zf.extractall(local_dir)

    index_search = list(pathlib.Path(local_dir).rglob("*index.faiss"))
    if len(index_search) != 1:
        raise ValueError("Missing index file in vectorstore")

    index_file = index_search[0]
    index_dir = index_file.parent
    print(list(index_dir.rglob("*")))

    print("Loading embeddings")
    embeddings = get_sagemaker_embeddings()
    return FAISS.load_local(index_dir, embeddings=embeddings)


def save_context(connection_id, qa_chain):
    # Generate pickle file from the conversation history
    with open("/tmp/chat_history.pkl", "wb") as f:
        pickle.dump(qa_chain.memory, f)

    # Generate unique identifier for this context
    context_id = uuid.uuid4().hex
    upload_key = f"context/{connection_id}/{context_id}-chat_history.pkl"

    # Upload to S3
    bucket = boto3.resource("s3").Bucket(S3_ASSETS_BUCKET_NAME)
    bucket.upload_file("/tmp/chat_history.pkl", upload_key)

    # Save pointer to context
    table = boto3.resource("dynamodb").Table(CONTEXT_TABLE_NAME)
    table.put_item(
        Item={
            "id": f"CONNECTION#{connection_id}",
            "connection_id": f"CONNECTION#{connection_id}#CONTEXT",
            "bucket_name": S3_ASSETS_BUCKET_NAME,
            "key": upload_key
        }
    )

def load_context(connection_id):
    # Retrieve pointer to existing context
    table = boto3.resource("dynamodb").Table(CONTEXT_TABLE_NAME)
    response = table.get_item(
        Key={
            "id": f"CONNECTION#{connection_id}",
            "connection_id": f"CONNECTION#{connection_id}#CONTEXT",
        },
        ConsistentRead=True
    )

    if not "Item" in response:
        print("No previous context found.")
        return None

    item = response["Item"]

    # Download
    bucket = boto3.resource("s3").Bucket(item["bucket_name"])
    bucket.download_file(item["key"], "/tmp/chat_history.pkl")

    with open("/tmp/chat_history.pkl", "rb") as f:
        return pickle.load(f)


def save_config(connection_id, config_dict):
    table = boto3.resource("dynamodb").Table(CONTEXT_TABLE_NAME)
    table.put_item(
        Item={
            "id": f"CONNECTION#{connection_id}",
            "connection_id": f"CONNECTION#{connection_id}#CONFIG",
            "config": config_dict
        }
    )


def load_config(connection_id):
    table = boto3.resource("dynamodb").Table(CONTEXT_TABLE_NAME)
    response = table.get_item(
        Key={
            "id": f"CONNECTION#{connection_id}",
            "connection_id": f"CONNECTION#{connection_id}#CONFIG",
        },
        ConsistentRead=True
    )

    if "Item" in response:
        return response["Item"]["config"]

    return None


def make_chain(connection_id, llm_type, vectorstore_key, bot_name, model_id, memory=None):
    """ Create a Q/A chain.
    """

    manager_q = CallbackManager([MyStdOutCallbackHandler()])
    manager = CallbackManager([MyStdOutCallbackHandler()])
    modelId = model_id
    question_llm_model_args, qa_llm_model_args = get_model_args(modelId)

    llm_q = Bedrock(
        callback_manager=manager_q, model_id= modelId, model_kwargs=question_llm_model_args)
    llm = Bedrock(callback_manager=manager, model_id= modelId, model_kwargs=qa_llm_model_args)

    if AWS_INTERNAL.upper() == "TRUE":
        bedrock_client = get_bedrock_client()
        if bedrock_client:
            llm_q.client=bedrock_client
        if bedrock_client:
            llm.client=bedrock_client

    print("Using LLM:", llm)

    question_chain = LLMChain(llm=llm_q, prompt=get_question_prompt(modelId))

    # Use a document chain with a customized prompt
    document_chain = load_qa_chain(
        llm, chain_type="stuff", prompt=get_document_prompt(bot_name, modelId))

    if memory is None:
        memory = ConversationBufferMemory(
            memory_key="chat_history", return_messages=True
        )

    qa_chain = ConversationalRetrievalChain(
        retriever=load_database(vectorstore_key).as_retriever(),
        combine_docs_chain=document_chain,
        question_generator=question_chain,
        memory=memory
    )

    return qa_chain


def get_bedrock_client():
    bedrock_session = boto3.Session(
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            aws_session_token=os.getenv('AWS_SESSION_TOKEN')
        )
    return bedrock_session.client(service_name="bedrock-runtime", region=os.environ['AWS_REGION'])