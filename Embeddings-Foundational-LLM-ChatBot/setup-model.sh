#!/bin/bash
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
# --  Purpose:       Setup Model
# --  Version:       0.1.0
# --  Disclaimer:    This script is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --


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

    if echo "$output" | grep -q "model.tar"; then
        echo "model.tar.gz completed"
        break
    fi

    # If file not found, sleep and then increment the retries counter
    sleep $SLEEP_DURATION
    RETRIES=$((RETRIES + 1))
    
    # Print the Docker logs instead of the retry count
    docker logs $container_id

    # If max retries reached, exit with an error
    if [[ $RETRIES -eq $MAX_RETRIES ]]; then
        echo "Error: Reached max retries. model.tar.gz not found in container."
        exit 1
    fi
done


# Create a directory on the host to copy the file to (if it doesn't already exist)
mkdir -p ./embeddings_model_file/ || { echo "Failed to create directory."; exit 1; }


# List the contents of the /app/embedding_model/ directory in the container
docker exec $container_id ls -alh /app/embedding_model/

# Copy the tar file from the container to the host
docker cp $container_id:/app/embedding_model/model.tar.gz ./embeddings_model_file/
echo "---- Files in embeddings_model_file directory ----"
ls -alh ./embeddings_model_file/

# Optionally, stop and remove the container after copying
docker stop $container_id
docker rm $container_id
