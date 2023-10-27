/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as cdk from "aws-cdk-lib";
import { ApiGatewayV2CloudFrontConstruct } from "./constructs/apigatewayv2-cloudfront-construct";
import { CognitoWebNativeConstruct } from "./constructs/cognito-web-native-construct";
import { ApiPythonConstruct } from "./constructs/api-python-construct";
import { Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Architecture } from "aws-cdk-lib/aws-lambda";

export interface ApiDefProps extends cdk.StackProps {
    readonly cognito: CognitoWebNativeConstruct;
    readonly api: ApiGatewayV2CloudFrontConstruct;
    readonly createChatHandlerRole: cdk.aws_iam.Role;
    readonly listSyncRunsHandlerRole: cdk.aws_iam.Role;
    readonly KendraIndexId: string;
    readonly KendraDataSourceIndexId: string;
    readonly chatMessageHistoryTableName: string;
    readonly syncRunsTableName: string;
    readonly docProcessingStateMachineArn:string;
    readonly stepFunctionsExecutionHandlerRole: cdk.aws_iam.Role;
    readonly kendraIngestionBucketName: string;
    readonly kendraAclExecutionHandlerRole: cdk.aws_iam.Role;
    readonly documentsArtifactsTableName: string;
    readonly documentsArtifactsHandlerRole: cdk.aws_iam.Role;
    readonly bedRockLambdaLayer: LayerVersion;
}


export class ApiDef {
    

    constructor(stack: cdk.Stack, props: ApiDefProps) {
        const thisStack = stack
        let apis = [

            
            {
                name: "ListSyncRuns",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/list-docs",
                timeout: cdk.Duration.seconds(60),
                environment: {
                    SYNC_RUN_TABLE: props.syncRunsTableName
                },
                routePath: "/api/datasyncjob",
                methods: [apigwv2.HttpMethod.GET],
                api: props.api.apiGatewayV2,
                memorySize: 256,
                role:props.listSyncRunsHandlerRole,
                layers: [],
                arch: Architecture.X86_64,
            },
            {
                name: "RunOnDemandSync",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/sfn-exec",
                timeout: cdk.Duration.seconds(60),
                environment: {
                    SFN_ARN: props.docProcessingStateMachineArn
                },
                routePath: "/api/datasync",
                methods: [apigwv2.HttpMethod.POST],
                api: props.api.apiGatewayV2,
                memorySize: 256,
                role:props.stepFunctionsExecutionHandlerRole,
                layers: [],
                arch: Architecture.X86_64,
            },
            {
                name: "GetKendraAcl",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/access-control-list/get",
                timeout: cdk.Duration.seconds(60),
                environment: {
                    KENDRA_INGESTION_BUCKET_NAME: props.kendraIngestionBucketName
                },
                routePath: "/api/acl",
                methods: [apigwv2.HttpMethod.GET],
                api: props.api.apiGatewayV2,
                memorySize: 256,
                role:props.kendraAclExecutionHandlerRole,
                layers: [],
                arch: Architecture.X86_64,
            },
            {
                name: "PostKendraAcl",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/access-control-list/post",
                timeout: cdk.Duration.seconds(60),
                environment: {
                    KENDRA_INGESTION_BUCKET_NAME: props.kendraIngestionBucketName
                },
                routePath: "/api/acl/create",
                methods: [apigwv2.HttpMethod.POST],
                api: props.api.apiGatewayV2,
                memorySize: 256,
                role:props.kendraAclExecutionHandlerRole,
                layers: [],
                arch: Architecture.X86_64,
            },
            {
                name: "listKeyPrefixes",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/document/list-folders/get",
                timeout: cdk.Duration.seconds(60),
                environment: {
                    DOCUMENTS_TABLE: props.documentsArtifactsTableName
                },
                routePath: "/api/document/list/folders",
                methods: [apigwv2.HttpMethod.GET],
                api: props.api.apiGatewayV2,
                memorySize: 256,
                role:props.documentsArtifactsHandlerRole,
                layers: [],
                arch: Architecture.X86_64,
            },
            {
                name: "logDocumentInfo",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/document/capture-doc-info/post",
                timeout: cdk.Duration.seconds(60),
                environment: {
                    DOCUMENTS_TABLE: props.documentsArtifactsTableName
                },
                routePath: "/api/document/create",
                methods: [apigwv2.HttpMethod.POST],
                api: props.api.apiGatewayV2,
                memorySize: 256,
                role:props.documentsArtifactsHandlerRole,
                layers: [],
                arch: Architecture.X86_64,
            },
            {
                name: "listDocsInKeyPrefix",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/document/list-docs/get",
                timeout: cdk.Duration.seconds(60),
                environment: {
                    DOCUMENTS_TABLE: props.documentsArtifactsTableName
                },
                routePath: "/api/document/list",
                methods: [apigwv2.HttpMethod.GET],
                api: props.api.apiGatewayV2,
                memorySize: 256,
                role:props.documentsArtifactsHandlerRole,
                layers: [],
                arch: Architecture.X86_64,
            },
            
        ];

        for (var val of apis) {

            new ApiPythonConstruct(thisStack, {
                runtime: val.runtime ? val.runtime : cdk.aws_lambda.Runtime.PYTHON_3_10,
                name: val.name,
                handler: val.handler ? val.handler : "lambda_handler",
                index: val.index ? val.index : "options.py",
                entry: val.entry ? val.entry: "../api/mock",
                timeout: val.timeout ? val.timeout : cdk.Duration.seconds(60),
                environment: val.environment,
                routePath: val.routePath,
                methods: val.methods,
                api: val.api,
                memorySize: val.memorySize,
                role: val.role,
                layers: val.layers,
                arch: val.arch
            });
        }
    }


}
