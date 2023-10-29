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

USER_POOL_ID=$1
USER_NAME=$2
PASSWORD=$3

set -e
echo "Creating user ${USER_NAME} for ${USER_POOL_ID} ..."

aws cognito-idp admin-create-user --user-pool-id "${USER_POOL_ID}" --username "${USER_NAME}" --temporary-password "T3mp@@s$" --message-action SUPPRESS
aws cognito-idp admin-set-user-password --user-pool-id "${USER_POOL_ID}" --username "${USER_NAME}" --password "${PASSWORD}" --permanent

echo "User ${USER_NAME} created"
