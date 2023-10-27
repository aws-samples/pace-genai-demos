# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import boto3
from prompts.titan_prompts import get_titan_document_prompt, get_titan_question_prompt
from prompts.claude_prompts import get_claude_document_prompt, get_claude_question_prompt
from prompts.jurassic_prompts import get_jurassic_document_prompt, get_jurassic_question_prompt

BOT_NAME="Guru"

def get_prompts(model_id):
    if model_id == "Amazon-Titan-Large":
        return get_titan_question_prompt(), get_titan_document_prompt(BOT_NAME)
    elif model_id == "Anthropic-Claude-V2":
        return get_claude_question_prompt(), get_claude_document_prompt(BOT_NAME)
    elif model_id == "AI21-Jurassic-2-Ultra":
        return get_jurassic_question_prompt(), get_jurassic_document_prompt(BOT_NAME)
    else:
        raise NameError("Invalid Model Specified - GetPrompts")