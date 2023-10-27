# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

from langchain.prompts.prompt import PromptTemplate

document_prompt_template = """Pretend you are a Q&A bot named {bot_name}. You will answer the question below using the context and nothing else. If you don't know return I don't know.

Context: {{context}}
Question: {{question}}
Answer:"""

def get_document_prompt(bot_name):
    template_with_name = document_prompt_template.format(bot_name=bot_name)

    return PromptTemplate(
        template=template_with_name, input_variables=["context", "question"]
    )

question_prompt_template = """Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question.

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone Question:"""""


def get_question_prompt():
    return PromptTemplate.from_template(question_prompt_template)
