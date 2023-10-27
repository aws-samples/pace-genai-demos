# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


from langchain.callbacks import StdOutCallbackHandler
from langchain.schema import AgentAction, AgentFinish, LLMResult
from typing import Any, Dict, List, Optional, Union
from langchain.llms.bedrock import Bedrock

class MyStdOutQuestionCallbackHandler(StdOutCallbackHandler):
    def on_llm_start(
        self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any
    ) -> None:
        """Print out the prompts."""
        print(f"Question Rephrase prompts={prompts}")

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        print(f"Question Rephrase llm_output={response.llm_output}")


class MyStdOutCallbackHandler(StdOutCallbackHandler):
    def on_llm_start(
        self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any
    ) -> None:
        """Print out the prompts."""
        print(f"QA prompts={prompts}")

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        print(f"QA llm_output={response.llm_output}")
