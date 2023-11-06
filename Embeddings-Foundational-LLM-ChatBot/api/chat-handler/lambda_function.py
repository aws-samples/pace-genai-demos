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

import os
import json
import uuid

CONTEXT_TABLE_NAME = os.environ["CONTEXT_TABLE_NAME"]
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
        "body": json.dumps(body),
      
    }