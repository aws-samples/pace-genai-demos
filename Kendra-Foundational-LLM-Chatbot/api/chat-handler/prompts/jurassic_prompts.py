# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


from langchain.prompts.prompt import PromptTemplate

def get_jurassic_document_prompt(bot_name):
    

    document_prompt_template = """You are a friendly customer service agent named {bot_name}.I want you to provide an answer to the question using the following context. 
    Do not include or reference XML tags or quoted content verbatim in the answer. If you do not have the information to answer the question, say "I did not find any useful information to share or you don't have permission to view this information.". 
    It is very important that you respond "I did not find any useful information to share or you don't have permission to view this information." if the answer in not explicitly contained within the provided context. NEVER make up an answer.

    Context: {{context}}
    Question: {{question}}
    Answer:"""

    template_with_name = document_prompt_template.format(bot_name=bot_name)
    return PromptTemplate(
        template=template_with_name, input_variables=["context", "question"]
    )



def get_jurassic_question_prompt():
    question_prompt_template = """Given the following conversation and a follow up question, Generate the follow up question to be a standalone question only if the follow up question is not a standalone question.
    If the follow up question is already a standalone question, ignore using the chat history and just return the follow up Input in your answer. 

    Chat History:
    {chat_history}
    Follow Up Input: {question}
    Standalone Question:"""""

    return PromptTemplate.from_template(question_prompt_template)