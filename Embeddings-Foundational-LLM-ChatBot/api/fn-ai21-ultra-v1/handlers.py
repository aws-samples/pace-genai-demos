# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

from langchain.callbacks import StdOutCallbackHandler
from langchain.schema import AgentAction, AgentFinish, LLMResult
from typing import Any, Dict, List, Optional, Union


class MyStdOutCallbackHandler(StdOutCallbackHandler):
    def on_llm_start(
        self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any
    ) -> None:
        """Print out the prompts."""
        print(prompts)

    def on_llm_end(self, response: LLMResult, **kwargs: Any) -> None:
        print(response.llm_output)