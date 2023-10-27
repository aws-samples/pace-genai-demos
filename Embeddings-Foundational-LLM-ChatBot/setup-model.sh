#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

# Build the Docker container
docker build --no-cache -t model-builder -f Dockerfile.model .

# Run the Docker container and capture its ID
container_id=$(docker run -d model-builder)

# Sleep for a short time to ensure the container has started and files are generated
RETRIES=0
MAX_RETRIES=60  # Try for a max of 30 times (adjust as necessary)
SLEEP_DURATION=60  # Sleep for 10 seconds between checks

while [[ $RETRIES -lt $MAX_RETRIES ]]; do
    # Check if the file exists in the container
    output=$(docker exec $container_id ls /app/embedding_model/)
    echo "Docker exec output: $output" # This will print the output, useful for debugging
    
    if echo "$output" | grep -q "model.tar.gz"; then
        echo "model.tar.gz found in container."
        break
    fi

    # If file not found, sleep and then increment the retries counter
    sleep $SLEEP_DURATION
    RETRIES=$((RETRIES + 1))

    echo "Retry count: $RETRIES"  # This will give you an idea of how many times it's tried

    # If max retries reached, exit with an error
    if [[ $RETRIES -eq $MAX_RETRIES ]]; then
        echo "Error: Reached max retries. model.tar.gz not found in container."
        exit 1
    fi
done


# Create a directory on the host to copy the file to (if it doesn't already exist)
mkdir -p /app/embedding_model

# List the contents of the /app/embedding_model/ directory in the container
docker exec $container_id ls -alh /app/embedding_model/

# Copy the tar file from the container to the host
docker cp $container_id:/app/embedding_model/model.tar.gz ./embedding_model_host/
echo "---- Files in embedding_model_host directory ----"
ls -alh ./embedding_model_host/

# Optionally, stop and remove the container after copying
docker stop $container_id
docker rm $container_id
