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

# When Deployment is done lets get the Input Bucket name from the Outputs and Update the env file
REACT_APP_UPLOAD_S3_BUCKET=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?contains(OutputKey, 'DocumentInputS3Bucket')].OutputValue" --output text)
echo "REACT_APP_UPLOAD_S3_BUCKET=${REACT_APP_UPLOAD_S3_BUCKET}" >> ./web-app/.env

LAMBDA_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='GuruPharmaAdEnvGenerationLambdaUrl'].OutputValue" --output text)
echo "REACT_APP_LAMBDA_URL=${LAMBDA_URL}" >> ./web-app/.env

# lets run a deployment again for the .env file change to be repackaged and deployed
npm run build
npm run deploy

echo "Deployment complete."


