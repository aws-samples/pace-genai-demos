// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Architecture } from "aws-cdk-lib/aws-lambda";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { ApiGatewayV2LambdaConstruct } from "./constructs/apigatewayv2-lambda-construct";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as lambdaPython from "@aws-cdk/aws-lambda-python-alpha";
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment";
import { Size } from "aws-cdk-lib/core";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy } from "aws-cdk-lib";
import { SsmParameterReaderConstruct } from "./constructs/ssm-parameter-reader-construct";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import { AmplifyConfigLambdaConstruct } from "./constructs/amplify-config-lambda-construct";
import { ApiGatewayV2CloudFrontConstruct } from "./constructs/apigatewayv2-cloudfront-construct";
import { CloudFrontS3WebSiteConstruct } from "./constructs/cloudfront-s3-website-construct";
import { CognitoWebNativeConstruct } from "./constructs/cognito-web-native-construct";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as eventsources from "aws-cdk-lib/aws-lambda-event-sources";
import { GuruPharmaApiPythonConstruct } from "./constructs/guru-pharma-contructs/guru-api-python-contruct";
export interface AppStackProps extends cdk.StackProps {
    readonly ssmWafArnParameterName: string;
    readonly ssmWafArnParameterRegion: string;
}

/**
 * AppStack for an S3 website and api gatewayv2 proxied through a CloudFront distribution
 *
 */

export class AppStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AppStackProps) {
        super(scope, id, props);

        const webAppBuildPath = "../web-app/build";
        const awsAccountId = cdk.Stack.of(this).account;
        const awsRegion = cdk.Stack.of(this).region;

        // Construct S3 Bucket -> Stores the PDFs files
        const documentInputLibraryBucket = new s3.Bucket(
            this,
            "GuruPharmaAdEnvInputDocumentLibraryBucket",
            {
                versioned: false,
                encryption: s3.BucketEncryption.S3_MANAGED,
                blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
                enforceSSL: true,
                removalPolicy: RemovalPolicy.DESTROY,
                eventBridgeEnabled: true,
                autoDeleteObjects: true,
            },
        );

        documentInputLibraryBucket.addCorsRule({
            allowedOrigins: ["*"],
            allowedMethods: [
                s3.HttpMethods.GET,
                s3.HttpMethods.PUT,
                s3.HttpMethods.POST,
                s3.HttpMethods.DELETE,
                s3.HttpMethods.HEAD,
            ],
            allowedHeaders: ["*"],
            exposedHeaders: ["ETag"],
            maxAge: 3000,
        });

        const defaultDocumentDeployment = new s3Deployment.BucketDeployment(
            this,
            "GuruPharmaAdEnvDeployDefaultDocument",
            {
                sources: [s3Deployment.Source.asset("../default_pdf")],
                destinationBucket: documentInputLibraryBucket,
                prune: false,
                destinationKeyPrefix: "public/reference-specifications/",
                memoryLimit: 5000,
                ephemeralStorageSize: Size.gibibytes(4),
            },
        );

        const defaultImageDeployment = new s3Deployment.BucketDeployment(
            this,
            "GuruPharmaAdEnvDeployDefaultImage",
            {
                sources: [s3Deployment.Source.asset("../default_image")],
                destinationBucket: documentInputLibraryBucket,
                prune: false,
                destinationKeyPrefix: "public/reference-images/",
                memoryLimit: 5000,
                ephemeralStorageSize: Size.gibibytes(4),
            },
        );

        new cdk.CfnOutput(this, "GuruPharmaAdEnvDocumentInputS3Bucket", {
            value: documentInputLibraryBucket.bucketName,
        });

        const cognito = new CognitoWebNativeConstruct(this, "Cognito", {
            documentInputLibraryBucketArn: documentInputLibraryBucket.bucketArn,
        });

        documentInputLibraryBucket.grantReadWrite(cognito.authenticatedRole);

        const cfWafWebAcl = new SsmParameterReaderConstruct(this, "SsmWafParameter", {
            ssmParameterName: props.ssmWafArnParameterName,
            ssmParameterRegion: props.ssmWafArnParameterRegion,
        }).getValue();

        documentInputLibraryBucket.grantReadWrite(cognito.authenticatedRole);

        const website = new CloudFrontS3WebSiteConstruct(this, "WebApp", {
            webSiteBuildPath: webAppBuildPath,
            webAclArn: cfWafWebAcl,
        });

        const api = new ApiGatewayV2CloudFrontConstruct(this, "Api", {
            cloudFrontDistribution: website.cloudFrontDistribution,
            userPool: cognito.userPool,
            userPoolClient: cognito.webClientUserPool,
        });

        new AmplifyConfigLambdaConstruct(this, "AmplifyConfigFn", {
            api: api.apiGatewayV2,
            appClientId: cognito.webClientId,
            identityPoolId: cognito.identityPoolId,
            userPoolId: cognito.userPoolId,
        });

        const referenceSpecifications = new dynamodb.Table(
            this,
            "GuruPharmaAdEnvReferenceSpecificationsTable",
            {
                billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
                partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
                removalPolicy: RemovalPolicy.DESTROY,
            },
        );

        const documentTableName = new ssm.StringParameter(
            this,
            "GuruPharmaAdEnvReferenceSpecificationsTableName",
            {
                parameterName: "/public/referenceSpecifications",
                stringValue: referenceSpecifications.tableName,
            },
        );

        const textractExtractTopicKey = new cdk.aws_kms.Key(
            this,
            `GuruPharmaAdEnvTextractExtractTopicKey`,
            { enableKeyRotation: true },
        );

        const textractExtractSNSTopic = new cdk.aws_sns.Topic(
            this,
            "GuruPharmaAdEnvTextractExtractSNSTopic",
            {
                topicName: `textractExtractSNSTopic-${cdk.Stack.of(this).stackName}`,
                masterKey: textractExtractTopicKey,
            },
        );

        const textractExtractTextractRole = new iam.Role(
            this,
            "GuruPharmaAdEnvTextractExtractTextractRole",
            {
                assumedBy: new iam.ServicePrincipal("textract.amazonaws.com"),
            },
        );
        textractExtractSNSTopic.grantPublish(textractExtractTextractRole);
        textractExtractTextractRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["kms:Decrypt", "kms:GenerateDataKey"],
                resources: [textractExtractTopicKey.keyArn],
            }),
        );

        const textractExtractFn = new lambdaPython.PythonFunction(
            this,
            "GuruPharmaAdEnvTextractExtractFn",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "trigger_extraction.py",
                entry: "../api/fn-textract",
                timeout: cdk.Duration.minutes(5),
                environment: {
                    DDB_TABLE_NAME: referenceSpecifications.tableName,
                    SNS_TOPIC_ARN: textractExtractSNSTopic.topicArn,
                    SNS_ROLE_ARN: textractExtractTextractRole.roleArn,
                },
            },
        );

        // Add permission to invoke textract:AnalyzeDocument to the documentDropHandler function
        textractExtractFn.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "textract:StartDocumentTextDetection",
                    "textract:StartDocumentAnalysis",
                    "textract:GetDocumentTextDetection",
                    "textract:GetDocumentAnalysis",
                ],
                resources: ["*"],
            }),
        );

        // Add permission to invoke textract:AnalyzeDocument to the documentDropHandler function
        textractExtractFn.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "textract:StartDocumentTextDetection",
                    "textract:StartDocumentAnalysis",
                    "textract:GetDocumentTextDetection",
                    "textract:GetDocumentAnalysis",
                ],
                resources: ["*"],
            }),
        );

        textractExtractFn.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "dynamodb:Scan",
                    "dynamodb:Query",
                    "dynamodb:DescribeTable",
                    "dynamodb:GetItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:PutItem",
                ],
                resources: [
                    `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${referenceSpecifications.tableName}`,
                ],
            }),
        );

        documentInputLibraryBucket.grantRead(textractExtractFn);

        documentInputLibraryBucket.addEventNotification(
            cdk.aws_s3.EventType.OBJECT_CREATED_PUT,
            new cdk.aws_s3_notifications.LambdaDestination(textractExtractFn),
            {
                prefix: "public/reference-specifications/",
            },
        );

        documentInputLibraryBucket.addEventNotification(
            cdk.aws_s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
            new cdk.aws_s3_notifications.LambdaDestination(textractExtractFn),
            {
                prefix: "public/reference-specifications/",
            },
        );

        const textractSaveResultsFn = new lambdaPython.PythonFunction(
            this,
            "GuruPharmaAdEnvTextractSaveResultsFn",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "save_results.py",
                entry: "../api/fn-textract",
                timeout: cdk.Duration.minutes(5),
                environment: {
                    DDB_TABLE_NAME: referenceSpecifications.tableName,
                },
            },
        );
        referenceSpecifications.grantFullAccess(textractSaveResultsFn);
        textractSaveResultsFn.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "textract:StartDocumentTextDetection",
                    "textract:StartDocumentAnalysis",
                    "textract:GetDocumentTextDetection",
                    "textract:GetDocumentAnalysis",
                ],

                resources: ["*"],
            }),
        );
        textractSaveResultsFn.addEventSource(
            new eventsources.SnsEventSource(textractExtractSNSTopic),
        );

        textractSaveResultsFn.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "dynamodb:Scan",
                    "dynamodb:Query",
                    "dynamodb:DescribeTable",
                    "dynamodb:GetItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:PutItem",
                ],
                resources: [
                    `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${referenceSpecifications.tableName}`,
                ],
            }),
        );

        const listSpecificationsFn = new lambdaPython.PythonFunction(
            this,
            "GuruPharmaAdEnvListSpecificationFn",
            {
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
                handler: "lambda_handler",
                index: "list_specifications.py",
                entry: "../api/fn-list-specification",
                timeout: cdk.Duration.minutes(5),
                environment: {
                    DDB_TABLE_NAME: referenceSpecifications.tableName,
                },
            },
        );

        referenceSpecifications.grantReadData(listSpecificationsFn);

        new ApiGatewayV2LambdaConstruct(this, "GuruPharmaAdEnvListSpecificationsApiGateway", {
            lambdaFn: listSpecificationsFn,
            routePath: "/api/assets/specifications",
            methods: [apigwv2.HttpMethod.GET],
            api: api.apiGatewayV2,
        });

        const modelLambdaFunctionHandlerRole = new cdk.aws_iam.Role(
            this,
            "GuruPharmaAdEnvModelLambdaFunctionHandlerRole",
            {
                description: "Role Model Lambda function",
                assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
            },
        );

        modelLambdaFunctionHandlerRole.addToPolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: ["cloudwatch:PutMetricData"],
                resources: ["*"],
            }),
        );

        modelLambdaFunctionHandlerRole.addToPolicy(
            new cdk.aws_iam.PolicyStatement({
                actions: [
                    "dynamodb:Scan",
                    "dynamodb:Query",
                    "dynamodb:DescribeTable",
                    "dynamodb:GetItem",
                    "dynamodb:UpdateItem",
                    "bedrock:InvokeModel",
                    "s3:GetObject",
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                ],
                resources: [
                    `arn:aws:dynamodb:${awsRegion}:${awsAccountId}:table/${referenceSpecifications.tableName}`,
                    `arn:aws:bedrock:${awsRegion}::foundation-model/*`,
                    `arn:aws:logs:*:*:*`,
                    `arn:aws:s3:::${documentInputLibraryBucket.bucketName}/*`,
                ],
            }),
        );

        const bedrockLambdaLayer = new LayerVersion(this, "bedrockLayer", {
            compatibleRuntimes: [Runtime.PYTHON_3_10],
            compatibleArchitectures: [Architecture.ARM_64],
            code: Code.fromAsset("../lambda-layer/python-bedrock-layer.zip"),
        });

        const apis = [
            {
                name: "AI21UltraModelV1",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/fn-ai21-ultra-v1",
                timeout: cdk.Duration.minutes(5),
                environment: {
                    DYNAMO_DB_TABLE_NAME: referenceSpecifications.tableName,
                },
                routePath: "/api/ai21-ultra-v1",
                methods: [apigwv2.HttpMethod.POST],
                api: api.apiGatewayV2,
                memorySize: 8000,
                role: modelLambdaFunctionHandlerRole,
                layers: [bedrockLambdaLayer],
                arch: Architecture.ARM_64,
            },
            {
                name: "AI21MidModelV1",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/fn-ai21-mid-v1",
                timeout: cdk.Duration.minutes(5),
                environment: {
                    DYNAMO_DB_TABLE_NAME: referenceSpecifications.tableName,
                },
                routePath: "/api/ai21-mid-v1",
                methods: [apigwv2.HttpMethod.POST],
                api: api.apiGatewayV2,
                memorySize: 8000,
                role: modelLambdaFunctionHandlerRole,
                layers: [bedrockLambdaLayer],
                arch: Architecture.ARM_64,
            },
            {
                name: "AnthropicClaudeV2",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/fn-anthropic-claude-v2",
                timeout: cdk.Duration.minutes(5),
                environment: {
                    DYNAMO_DB_TABLE_NAME: referenceSpecifications.tableName,
                },
                routePath: "/api/anthropic-claude-v2",
                methods: [apigwv2.HttpMethod.POST],
                api: api.apiGatewayV2,
                memorySize: 8000,
                role: modelLambdaFunctionHandlerRole,
                layers: [bedrockLambdaLayer],
                arch: Architecture.ARM_64,
            },
            {
                name: "AnthropicClaudeV1",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/fn-anthropic-claude-v1",
                timeout: cdk.Duration.minutes(5),
                environment: {
                    DYNAMO_DB_TABLE_NAME: referenceSpecifications.tableName,
                },
                routePath: "/api/anthropic-claude-v1",
                methods: [apigwv2.HttpMethod.POST],
                api: api.apiGatewayV2,
                memorySize: 8000,
                role: modelLambdaFunctionHandlerRole,
                layers: [bedrockLambdaLayer],
                arch: Architecture.ARM_64,
            },
            {
                name: "StableDiffusionXL",
                runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: "lambda_handler",
                index: "lambda_function.py",
                entry: "../api/fn-stable-diffusion-xl",
                timeout: cdk.Duration.minutes(5),
                environment: {
                    DYNAMO_DB_TABLE_NAME: referenceSpecifications.tableName,
                    S3_INPUT_ASSETS_BUCKET_NAME: documentInputLibraryBucket.bucketName,
                },
                routePath: "/api/stable-diffusion-xl",
                methods: [apigwv2.HttpMethod.POST],
                api: api.apiGatewayV2,
                memorySize: 8000,
                role: modelLambdaFunctionHandlerRole,
                layers: [bedrockLambdaLayer],
                arch: Architecture.ARM_64,
            },
        ];

        for (const val of apis) {
            new GuruPharmaApiPythonConstruct(this, val.name, {
                name: val.name,
                runtime: val.runtime ? val.runtime : cdk.aws_lambda.Runtime.PYTHON_3_10,
                handler: val.handler ? val.handler : "lambda_handler",
                index: val.index ? val.index : "lambda_function.py",
                entry: val.entry,
                timeout: val.timeout,
                memorySize: val.memorySize,
                environment: val.environment,
                routePath: val.routePath,
                methods: val.methods,
                api: val.api,
                role: val.role,
                layers: val.layers,
                arch: val.arch,
            });
        }

        defaultDocumentDeployment.node.addDependency(documentInputLibraryBucket);
        defaultDocumentDeployment.node.addDependency(textractSaveResultsFn);
        defaultDocumentDeployment.node.addDependency(referenceSpecifications);
        defaultDocumentDeployment.node.addDependency(textractExtractFn);
    }
}
