# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


def get_titan_document_prompt(question, context):

    document_prompt_template = f"""You are a friendly customer service agent.I want you to provide a verbose answer to the question using the following context. 
    Do not include or reference XML tags or quoted content verbatim in the answer. If you do not have the information to answer the question, say "I did not find any useful information to share or you don't have permission to view this information.". 
    It is very important that you respond "I did not find any useful information to share or you don't have permission to view this information." if the answer in not explicitly contained within the provided context. NEVER make up an answer.

    Context: {context}

    Question: {question}

    Answer:
    """
    
    return document_prompt_template


