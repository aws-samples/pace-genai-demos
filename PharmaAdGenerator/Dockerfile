# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
FROM public.ecr.aws/lambda/python:3.10
USER root
RUN yum install -q -y zip unzip
RUN mkdir python
RUN mkdir /tmp/layer
RUN python3.10 -m pip install Pillow botocore==1.31.62 boto3==1.28.62 --target ./python
RUN zip -q -r /tmp/layer/python-bedrock-layer.zip ./python
