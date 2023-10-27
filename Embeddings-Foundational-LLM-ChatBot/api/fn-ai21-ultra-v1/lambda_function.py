# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import json
import uuid

DYNAMODB_TABLE_NAME = os.environ["DYNAMODB_TABLE_NAME"]
LLM_SAGEMAKER_ENDPOINT = os.environ["EMBEDDINGS_SAGEMAKER_ENDPOINT"]
EMBEDDINGS_SAGEMAKER_ENDPOINT = os.environ["EMBEDDINGS_SAGEMAKER_ENDPOINT"]

import bot

def lambda_handler(event, context):
    _ = context
    print(event)

    body = event.get("body", "{}")
    body = json.loads(body)

    conversation_id = body.get("conversation_id")
    if not conversation_id:
        # Initialize new context
        llm_type = body.get("llm_type", "amazon_api_gateway")
        vectorstore_key = body.get("vectorstore_key")
        bot_name = body.get("bot_name", "Guru")
        conversation_id = uuid.uuid4().hex

        config = {
            "llm_type": llm_type,
            "vectorstore_key": vectorstore_key,
            "bot_name": bot_name
        }

        bot.save_config(conversation_id, config)
        print("Saved config:", config)
    else:
        # Load context from previous conversation
        config = bot.load_config(conversation_id)
        print("Loaded config:", config)

    # Load up existing context
    memory = bot.load_context(conversation_id)

    # Generate answer
    question = body["question"]
    qa_chain = bot.make_chain(
        conversation_id,
        config["llm_type"],
        config["vectorstore_key"],
        config["bot_name"],
        memory=memory
    )
    

    qa_result = qa_chain({"question": question })
    answer = qa_result["answer"].strip()
    
    body = {
        "answer":  answer,
        "conversation_id": conversation_id,
        "config": config
    }

    bot.save_context(conversation_id, qa_chain)

    return {
        "statusCode": 200,
        "headers": {
            "Cache-Control": "no-cache, no-store", 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*"
        },
        "body": json.dumps(body),
        "isBase64Encoded": False
    }