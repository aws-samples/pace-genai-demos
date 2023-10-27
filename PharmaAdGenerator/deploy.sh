#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

set -o pipefail # FAIL FAST
shopt -s expand_aliases

export STACK_NAME="guru-pharma-ad-studio"

# Tutorial: Deployment scrips can be very complicated or very simple. Depending on your flow.
## It is recommended you try to keep all deployment of resources contained in CDK if possible
## There are exceptions to this such as training jobs or seeding data.
echo "******************"
echo ""
echo "Tool Versions:"
echo "Python version: $(python3 --version)"
echo "Node version: $(node --version)" 
echo "NPM version: $(npm --version)"
echo ""
echo "******************"

chmod +x create-layer.sh
source ./create-layer.sh

touch ./web-app/.env

# Run build
npm install
npm run build
# Sometimes the build can take a while -- if credentials run out you can refresh them with this helper function
npm run deploy.bootstrap
npm run deploy

# When Deployment is done lets get the Kenda Input Bucket name from the Outputs and Update the env file
REACT_APP_UPLOAD_S3_BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?contains(OutputKey, 'DocumentInputS3Bucket')].OutputValue" --output text)
echo "REACT_APP_UPLOAD_S3_BUCKET=${REACT_APP_UPLOAD_S3_BUCKET}" >> ./web-app/.env

# lets run a deployment again for the .env file change to be repackaged and deployed
npm run build
npm run deploy

echo "Deployment complete."



