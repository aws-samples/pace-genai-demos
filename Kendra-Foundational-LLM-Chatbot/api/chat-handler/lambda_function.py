# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import json
import uuid
import os
import boto3
from langchain.chains import ConversationalRetrievalChain
from langchain.chains.llm import LLMChain
from langchain.chains.question_answering import load_qa_chain
#from kendra_retriever import AmazonKendraRetriever
from langchain.retrievers import AmazonKendraRetriever
#from chat_message_history import DynamoDBChatMessageHistory
from prompts_factory import get_prompts
from llm_factory import get_bedrock_llms
from botocore.config import Config
import urllib.parse
from langchain.memory.chat_message_histories import DynamoDBChatMessageHistory
from langchain.memory import ConversationBufferMemory
from langchain.prompts.prompt import PromptTemplate

CHAT_MESSAGE_HISTORY_TABLE_NAME = os.environ["CHAT_MESSAGE_HISTORY_TABLE_NAME"]
AWS_INTERNAL = os.environ["AWS_INTERNAL"]

s3_client = boto3.client('s3')
ddb_client = boto3.resource("dynamodb")
session_table = ddb_client.Table(CHAT_MESSAGE_HISTORY_TABLE_NAME)
MAX_HISTORY_LENGTH = 10
BOT_NAME="Guru"

region = os.environ["AWS_REGION"]
kendra_index_id = os.environ["KENDRA_INDEX_ID"]
NO_OF_PASSAGES_PER_PAGE = os.environ["NO_OF_PASSAGES_PER_PAGE"]
NO_OF_SOURCES_TO_LIST = os.environ["NO_OF_SOURCES_TO_LIST"]


def lambda_handler(event, context):
    try:
        _ = context
        print(event)

        # ConversationId is the SessionId
        body = event.get("body", "{}")
        body = json.loads(body)

        model_id = body.get("model_id")
        conversation_id = body.get("conversationId")
        jwt_token = body.get("token")
        
        # If frontend does not pass a conversationId, create a new one
        if not conversation_id:
            # This is the start of a new conversation
            conversation_id = uuid.uuid4().hex
        
        # Run question through chain
        question = body["question"]
        print(f"body['question']={question}")
        qa_chain, kendra_retriever = build_chain(model_id, jwt_token, question, conversation_id)
        print(f"kendra_retriever.metadata={kendra_retriever.metadata}")
        # Only use the AI responded Message History for running the chain
        qa_result = run_chain(qa_chain, question)
        
        print(f"qa_result={qa_result}")
        answer = qa_result["answer"].strip()
        print(f"answer = {answer}")
        source_page_info = get_relevant_doc_names(qa_result)

        body = {
            "source_page": source_page_info if should_source_be_included(answer) else [],
            "answer": answer,
            "conversationId": conversation_id
        }

        return {
            "statusCode": 200,
            "headers": {
                "Cache-Control": "no-cache, no-store",
                "Content-Type": "application/json"
            },
            "body": json.dumps(body),
            "isBase64Encoded": False
        }
    except Exception as e:
        print(e)
        return {
            "statusCode": 500,
            "headers": {
                "Cache-Control": "no-cache, no-store",
                "Content-Type": "application/json"
            },
            "body": json.dumps( {
                "source_page": [],
                "answer": "Hmm, I ran into errors. Please re-try.",
                "conversationId": conversation_id
            }),
            "isBase64Encoded": False
        }

def should_source_be_included(ans):
    answer = ans.lower()
    words_with_no_source = ["unfortunately", "i do not have", "i'm sorry", "i do not see", "i did not find", "avoid profanity"]
    include = True
    for substring in words_with_no_source:
        if substring in answer:
            include = False
            break
    return include

def get_relevant_doc_names(qa_result):
    sources = []
    doc_names = []

    if 'source_documents' in qa_result:
        for d in qa_result['source_documents']:
            sources.append(d.metadata['source'])

    if sources:
        source_groups_weight_dict = get_doc_uri(sources)
        print(f"source_groups_weight_dict={source_groups_weight_dict}")
        most_relevant_docs = sorted(source_groups_weight_dict, key=source_groups_weight_dict.get, reverse=True)
        print(f"most_relevant_docs={most_relevant_docs}")
        # Restrict the sources being listed based on Env Value
        most_relevant_docs = most_relevant_docs[:int(NO_OF_SOURCES_TO_LIST)]
        for doc_path in most_relevant_docs:
            doc_names.append( { "file_name": get_source_file_name(doc_path), "file": get_presigned_url(doc_path) })

    return doc_names

def get_source_file_name(source):
    parts = source.split("/")
    # returns Annual-Report.pdf
    return parts[len(parts)-1:][0]

def get_doc_uri(sources):
    res = {}
    for source in sources:
        if source not in res:
            res[source] = 1
        else:
            res[source] += 1
    return res


def get_kendra_metadata(conversation_id):
    session_table = ddb_client.Table(CHAT_MESSAGE_HISTORY_TABLE_NAME)
    response = session_table.get_item(Key={"SessionId": conversation_id})
    if response and "Item" in response:
        if 'KendraMetadata' in response['Item']:
            return response["Item"]['KendraMetadata']
    return {}

def run_chain(chain, prompt: str, history=[]):
    return chain({"question": prompt})

def build_chain(model_id, jwt_token, question, session_id):
    
    llm_q, llm = get_bedrock_llms(model_id)
    question_prompt, document_prompt = get_prompts(model_id)
    
    question_chain = LLMChain(llm=llm_q, prompt=question_prompt)
    print(f"This is question chain={question_chain}")

    document_chain = load_qa_chain(llm, chain_type='stuff', prompt=document_prompt)
    kendra_retriever = AmazonKendraRetriever(
                                                index_id=kendra_index_id,
                                                top_k=int(NO_OF_PASSAGES_PER_PAGE),
                                                user_context={
                                                    'Token':jwt_token
                                            })
    message_history = DynamoDBChatMessageHistory(table_name=CHAT_MESSAGE_HISTORY_TABLE_NAME, session_id=session_id)
    memory = ConversationBufferMemory(
        memory_key="chat_history", chat_memory=message_history, output_key='answer', return_messages=True
    )
    qa_chain = ConversationalRetrievalChain(
        retriever=kendra_retriever,
        combine_docs_chain=document_chain,
        question_generator=question_chain,
        memory=memory,
        return_source_documents=True
    )
    return qa_chain, kendra_retriever

def get_presigned_url(s3_file_path):
        parts = s3_file_path.split("/")
        bucket = parts[3]
        key = '/'.join(parts[4:])
        
        s3 = boto3.client('s3', config=Config(signature_version='s3v4', s3={'addressing_style': 'virtual'}))
        response = s3.generate_presigned_url(
            ClientMethod='get_object',
            Params={
                'Bucket': bucket,
                'Key': key
            },
            ExpiresIn=300
        )
        return response

