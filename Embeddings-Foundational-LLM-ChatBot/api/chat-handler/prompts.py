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
# --  Linkedin:      https://www.linkedin.com/in/ztanruan
# --  Date:          04/11/2023
# --  Purpose:       Large Language Model Prompts
# --  Version:       0.1.0
# --  Disclaimer:    This code is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

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
