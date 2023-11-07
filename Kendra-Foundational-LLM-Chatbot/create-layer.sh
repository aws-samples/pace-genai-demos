#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

directory="lambda-layer"
 
if [ ! -d "$directory" ]; then
    mkdir -p "$directory"
fi

docker build --no-cache --platform linux/amd64 . -t bedrock-langchain:latest
container_id=$(docker run --platform linux/amd64 -t -d bedrock-langchain /bin/bash)
docker cp $container_id:/tmp/layer/python-bedrock-langchain-layer.zip ./lambda-layer
