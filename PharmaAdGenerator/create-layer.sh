#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0


directory="lambda-layer"
 
if [ ! -d "$directory" ]; then
    mkdir -p "$directory"
fi

docker build --no-cache . -t bedrock-layer-builder:latest
container_id=$(docker run --platform linux/amd64 -t -d bedrock-layer-builder /bin/bash)
docker cp $container_id:/tmp/layer/python-bedrock-layer.zip ./lambda-layer
