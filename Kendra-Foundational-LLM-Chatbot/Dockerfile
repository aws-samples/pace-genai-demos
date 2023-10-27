# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
FROM public.ecr.aws/lambda/python:3.10
USER root
RUN yum install -q -y zip unzip
RUN mkdir python
RUN mkdir /tmp/layer
RUN python3.10 -m pip install boto3==1.28.57 botocore==1.31.57 langchain==0.0.306 --target ./python
RUN zip -q -r /tmp/layer/python-bedrock-langchain-layer.zip ./python