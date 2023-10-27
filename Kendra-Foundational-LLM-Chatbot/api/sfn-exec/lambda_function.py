# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import json
import boto3


SFN_ARN = os.getenv('SFN_ARN')
states_client = boto3.client("stepfunctions")


def build_response(message, code=200):
    return {
        "statusCode": code,
        "headers": {
            "Cache-Control": "no-cache, no-store",
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": json.dumps(message),
        "isBase64Encoded": False
    }

def lambda_handler(event, _):
    response = states_client.start_execution(
        stateMachineArn=SFN_ARN
    )

    return build_response({
        "sfnResponse": response['executionArn']
    })
