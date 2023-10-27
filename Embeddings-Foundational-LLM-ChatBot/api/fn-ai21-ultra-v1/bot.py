# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import pathlib
import os
import uuid
import zipfile
import pickle
import boto3

from langchain.chains.llm import LLMChain
from langchain.chains import ConversationalRetrievalChain
from langchain.chains.question_answering import load_qa_chain
# from langchain.chains.chat_vector_db.prompts import CONDENSE_QUESTION_PROMPT, QA_PROMPT
from langchain.memory import ConversationBufferMemory
from langchain.callbacks.manager import CallbackManager
from langchain.vectorstores.faiss import FAISS

# from ai21_llm import LLM_Wrapper

from embeddings import get_sagemaker_embeddings
from handlers import MyStdOutCallbackHandler
from llms import AmazonAPIGateway
from prompts import get_document_prompt, get_question_prompt

DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE_NAME"]
S3_ASSETS_BUCKET_NAME = os.environ["S3_ASSETS_BUCKET_NAME"]
LLM_SAGEMAKER_ENDPOINT = os.environ["LLM_SAGEMAKER_ENDPOINT"]

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
    table = boto3.resource("dynamodb").Table(DYNAMODB_TABLE_NAME)
    table.put_item(
        Item={
            "pk": f"CONNECTION#{connection_id}",
            "sk": f"CONNECTION#{connection_id}#CONTEXT",
            "bucket_name": S3_ASSETS_BUCKET_NAME,
            "key": upload_key
        }
    )


def load_context(connection_id):
    # Retrieve pointer to existing context
    table = boto3.resource("dynamodb").Table(DYNAMODB_TABLE_NAME)
    response = table.get_item(
        Key={
            "pk": f"CONNECTION#{connection_id}",
            "sk": f"CONNECTION#{connection_id}#CONTEXT",
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
    table = boto3.resource("dynamodb").Table(DYNAMODB_TABLE_NAME)
    table.put_item(
        Item={
            "pk": f"CONNECTION#{connection_id}",
            "sk": f"CONNECTION#{connection_id}#CONFIG",
            "config": config_dict
        }
    )


def load_config(connection_id):
    table = boto3.resource("dynamodb").Table(DYNAMODB_TABLE_NAME)
    response = table.get_item(
        Key={
            "pk": f"CONNECTION#{connection_id}",
            "sk": f"CONNECTION#{connection_id}#CONFIG",
        },
        ConsistentRead=True
    )

    if "Item" in response:
        return response["Item"]["config"]

    return None


def make_chain(connection_id, llm_type, vectorstore_key, bot_name, memory=None):
    """ Create a Q/A chain.
    """

    manager_q = CallbackManager([MyStdOutCallbackHandler()])
    manager = CallbackManager([MyStdOutCallbackHandler()])
    
    llm_q = AmazonAPIGateway(
        callback_manager=manager_q, model_kwargs={"temperature": 1.0})
    llm = AmazonAPIGateway(callback_manager=manager, model_kwargs={"temperature": 0.0})

    print("Using LLM:", llm)

    # llm_q = LLM_Wrapper(callback_manager=manager_q, base_llm=llm_q)
    # llm = LLM_Wrapper(callback_manager=manager, base_llm=llm)

    question_chain = LLMChain(llm=llm_q, prompt=get_question_prompt())

    """
    if llm_type == "openai":
        # Use he default prompt, works well with OpenAI
        document_chain = load_qa_chain(llm, chain_type="stuff", prompt=QA_PROMPT)
    else:
        # Use our own custom prompt, works well with AI21
        document_chain = load_qa_chain(llm, chain_type="stuff", prompt=CUSTOM_QA_PROMPT)
    """

    # Use a document chain with a customized prompt
    document_chain = load_qa_chain(
        llm, chain_type="stuff", prompt=get_document_prompt(bot_name))

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