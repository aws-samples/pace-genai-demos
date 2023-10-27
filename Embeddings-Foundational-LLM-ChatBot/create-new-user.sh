#!/bin/bash 
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

USER_POOL_ID=$1
USER_NAME=$2
PASSWORD=$3


set -e
echo "Creating user ${USER_NAME} for ${USER_POOL_ID} ..."

aws cognito-idp admin-create-user --user-pool-id "${USER_POOL_ID}" --username "${USER_NAME}" --temporary-password "T3mp@@s$" --message-action SUPPRESS
aws cognito-idp admin-set-user-password --user-pool-id "${USER_POOL_ID}" --username "${USER_NAME}" --password "${PASSWORD}" --permanent

echo "User ${USER_NAME} created"
