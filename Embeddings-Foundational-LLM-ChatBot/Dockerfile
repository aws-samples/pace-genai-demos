# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
FROM public.ecr.aws/lambda/python:3.10
USER root
RUN yum install -q -y zip unzip
RUN mkdir python
RUN mkdir /tmp/layer
RUN python3.10 -m pip install faiss-cpu==1.7.4 tiktoken==0.4.0 pydantic==1.10.8 boto3==1.26.142 botocore==1.29.148 langchain==0.0.192 --target ./python
RUN zip -q -r /tmp/layer/python-bedrock-langchain-layer.zip ./python
