// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecsPatterns from "@aws-cdk/aws-ecs-patterns";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as stepfunctionsTasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { aws_logs as logs } from "aws-cdk-lib";
import * as stepfunctions from "aws-cdk-lib/aws-stepfunctions";
import { Code, LayerVersion, Runtime } from "aws-cdk-lib/aws-lambda";
import { Architecture } from "aws-cdk-lib/aws-lambda";
import { S3EventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as apigwv2 from "@aws-cdk/aws-apigatewayv2-alpha";
import * as lambdaPython from "@aws-cdk/aws-lambda-python-alpha";
import * as s3Deployment from "aws-cdk-lib/aws-s3-deployment";
import { Size } from "aws-cdk-lib/core";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct, Dependable } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { SsmParameterReaderConstruct } from "./constructs/ssm-parameter-reader-construct";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import { AmplifyConfigLambdaConstruct } from "./constructs/amplify-config-lambda-construct";
import { ApiGatewayV2CloudFrontConstruct } from "./constructs/apigatewayv2-cloudfront-construct";
import { CloudFrontS3WebSiteConstruct } from "./constructs/cloudfront-s3-website-construct";
import { CognitoWebNativeConstruct } from "./constructs/cognito-web-native-construct";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

export interface AppStackProps extends cdk.StackProps {
  readonly ssmWafArnParameterName: string;
  readonly ssmWafArnParameterRegion: string;
}

import * as cr from "aws-cdk-lib/custom-resources";
import { GuruApiPythonConstruct } from "./constructs/guru-contructs/guru-api-python-contruct";

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
      "GuruChatEnvInputDocumentLibraryBucket",
      {
        versioned: true,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        eventBridgeEnabled: true,
        autoDeleteObjects: true,
      }
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

    // Construct S3 Bucket -> Stores the vector PKL for the documents
    const documentOutputLibraryBucket = new s3.Bucket(
      this,
      "GuruChatEnvOutputDocumentLibraryBucket",
      {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        eventBridgeEnabled: true,
        autoDeleteObjects: true,
      }
    );

    new cdk.CfnOutput(this, "GuruChatEnvDocumentInputS3Bucket", {
      value: documentInputLibraryBucket.bucketName,
    });

    // Creating the Lambda Layer
    const bedrockLambdaLayer = new LayerVersion(
      this,
      "GuruChatEnvBedrockLangchainLayer",
      {
        compatibleRuntimes: [Runtime.PYTHON_3_10],
        compatibleArchitectures: [Architecture.ARM_64],
        code: Code.fromAsset(
          "../lambda-layer/python-bedrock-langchain-layer.zip"
        ),
      }
    );

    const cognito = new CognitoWebNativeConstruct(this, "Cognito", {
      documentInputLibraryBucketArn: documentInputLibraryBucket.bucketArn,
    });

    const cfWafWebAcl = new SsmParameterReaderConstruct(
      this,
      "SsmWafParameter",
      {
        ssmParameterName: props.ssmWafArnParameterName,
        ssmParameterRegion: props.ssmWafArnParameterRegion,
      }
    ).getValue();

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

    // Construct DynamoDB Table -> Chat Context
    const chatContextTable = new dynamodb.Table(
      this,
      "GuruChatEnvContextDynamoTable",
      {
        partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
        removalPolicy: RemovalPolicy.DESTROY,
        sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      }
    );

    // Construct S3 Bucket -> Stores the serialized vector for the chat bot
    const chatBotConversationLogBucket = new s3.Bucket(
      this,
      "GuruChatEnvSerializedVectorBucket",
      {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    );

    // Construct S3 Bucket -> Stores the package model
    const chatBotSageMakerModelsBucket = new s3.Bucket(
      this,
      "GuruChatEnvSageMakerModelsBucket",
      {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    );

    new cdk.CfnOutput(this, "GuruChatEnvSerializedVectorBucketName", {
      value: chatBotConversationLogBucket.bucketName,
    });

    new cdk.CfnOutput(this, "GuruChatEnvSageMakerModelsBucketName", {
      value: chatBotSageMakerModelsBucket.bucketName,
    });

    const EmbeddingsModelPackageBucket = new s3.Bucket(
      this,
      "GuruChatEnvEmbeddingsModelPackageBucket",
      {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    );

    const EmbeddingsModelDeployment = new s3Deployment.BucketDeployment(
      this,
      "GuruChatEnvDeployEmbeddingsModel",
      {
        sources: [s3Deployment.Source.asset("../embeddings_model_host")],
        destinationBucket: EmbeddingsModelPackageBucket,
        prune: false,
        memoryLimit: 10000,
        ephemeralStorageSize: Size.gibibytes(10),
      }
    );

    // Create the SageMaker ExecutionRole
    const SagemakerExecutionRole = new iam.Role(
      this,
      "GuruChatEnvSagemakerExecutionRole",
      {
        assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
      }
    );

    // Add permissions to read from the S3 bucket
    EmbeddingsModelPackageBucket.grantRead(SagemakerExecutionRole);

    // Attach AmazonSageMakerFullAccess policy to the execution role
    SagemakerExecutionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess")
    );

    const sageMakerEmbeddingModelHandlerFn = new lambdaPython.PythonFunction(
      this,
      "GuruChatEnvSageMakerEmbeddingModelHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/fn-embeddings",
        timeout: cdk.Duration.minutes(15),
        environment: {
          S3_EMBEDDING_MODEL_PACKAGE_NAME:
            EmbeddingsModelPackageBucket.bucketName,
          SAGEMAKER_EXECUTION_ROLE: SagemakerExecutionRole.roleArn,
        },
        memorySize: 2000,
        architecture: cdk.aws_lambda.Architecture.X86_64,
      }
    );

    // add sagemaker managed policy to the lambda function
    sageMakerEmbeddingModelHandlerFn.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess")
    );

    // Add permissions to read from the S3 bucket
    EmbeddingsModelPackageBucket.grantRead(sageMakerEmbeddingModelHandlerFn);

    sageMakerEmbeddingModelHandlerFn.addEventSource(
      new S3EventSource(EmbeddingsModelPackageBucket, {
        events: [
          s3.EventType.OBJECT_CREATED_PUT,
          s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
        ],
      })
    );

    // Construct DynamoDB Table -> Documents
    const documentTable = new dynamodb.Table(
      this,
      "GuruChatEnvChatDocumentTable",
      {
        partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
        removalPolicy: RemovalPolicy.DESTROY,
      }
    );

    const insertDefaultDocumentHandlerFn = new lambdaPython.PythonFunction(
      this,
      "GuruChatEnvInsertDefaultDocumentHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/fn-insert-default-document",
        timeout: cdk.Duration.minutes(3),
        retryAttempts: 0,
        memorySize: 1024,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          DYNAMODB_TABLE_NAME: documentTable.tableName,
          S3_OUTPUT_ASSETS_BUCKET_NAME: documentOutputLibraryBucket.bucketName,
        },
      }
    );

    documentTable.grantWriteData(insertDefaultDocumentHandlerFn);

    new cdk.CfnOutput(this, "GuruChatEnvDocumentTableArn", {
      value: documentTable.tableArn,
    });

    insertDefaultDocumentHandlerFn.node.addDependency(documentTable);

    const customInsertDocumentResource = new cdk.CustomResource(
      this,
      "GuruChatEnvInsertDocumentRecord",
      {
        serviceToken: insertDefaultDocumentHandlerFn.functionArn,
      }
    );

    customInsertDocumentResource.node.addDependency(
      insertDefaultDocumentHandlerFn
    );

    const eventSource = new S3EventSource(documentOutputLibraryBucket, {
      events: [
        s3.EventType.OBJECT_CREATED_PUT,
        s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
      ],
    });

    const defaultEmbeddingsDocumentDeployment =
      new s3Deployment.BucketDeployment(
        this,
        "GuruChatEnvDeployDefaultEmbeddingsDocument",
        {
          sources: [s3Deployment.Source.asset("../default_documents")],
          destinationBucket: documentOutputLibraryBucket,
          prune: false,
          memoryLimit: 5000,
          ephemeralStorageSize: Size.gibibytes(4),
        }
      );

    // add sagemaker managed policy to the lambda function

    const dynamoDbReadOnlyPolicyDocumentTable = new iam.PolicyStatement({
      actions: [
        "dynamodb:BatchGetItem",
        "dynamodb:DescribeImport",
        "dynamodb:ConditionCheckItem",
        "dynamodb:DescribeContributorInsights",
        "dynamodb:Scan",
        "dynamodb:ListTagsOfResource",
        "dynamodb:Query",
        "dynamodb:DescribeStream",
        "dynamodb:DescribeTimeToLive",
        "dynamodb:DescribeGlobalTableSettings",
        "dynamodb:PartiQLSelect",
        "dynamodb:DescribeTable",
        "dynamodb:GetShardIterator",
        "dynamodb:DescribeGlobalTable",
        "dynamodb:GetItem",
        "dynamodb:DescribeContinuousBackups",
        "dynamodb:DescribeExport",
        "dynamodb:DescribeKinesisStreamingDestination",
        "dynamodb:DescribeBackup",
        "dynamodb:GetRecords",
        "dynamodb:DescribeTableReplicaAutoScaling",
      ],
      resources: [
        `arn:aws:dynamodb:*:${awsAccountId}:table/${documentTable.tableName}`,
      ],
    });

    const sagemakerFullAccessPolicy = new iam.PolicyStatement({
      actions: ["*"],
      resources: ["*"],
    });

    const s3BucketAccessPolicy = new iam.PolicyStatement({
      actions: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
      resources: [
        `arn:aws:s3:::${documentOutputLibraryBucket.bucketName}/*`,
        `arn:aws:s3:::${chatBotConversationLogBucket.bucketName}/*`,
      ],
    });

    const dynamoDbAccessPolicyContextTable = new iam.PolicyStatement({
      actions: [
        "dynamodb:BatchGetItem",
        "dynamodb:DescribeImport",
        "dynamodb:ConditionCheckItem",
        "dynamodb:DescribeContributorInsights",
        "dynamodb:Scan",
        "dynamodb:ListTagsOfResource",
        "dynamodb:Query",
        "dynamodb:DescribeStream",
        "dynamodb:DescribeTimeToLive",
        "dynamodb:DescribeGlobalTableSettings",
        "dynamodb:PartiQLSelect",
        "dynamodb:DescribeTable",
        "dynamodb:GetShardIterator",
        "dynamodb:DescribeGlobalTable",
        "dynamodb:GetItem",
        "dynamodb:DescribeContinuousBackups",
        "dynamodb:DescribeExport",
        "dynamodb:DescribeKinesisStreamingDestination",
        "dynamodb:DescribeBackup",
        "dynamodb:GetRecords",
        "dynamodb:DescribeTableReplicaAutoScaling",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
      ],
      resources: [
        `arn:aws:dynamodb:*:${awsAccountId}:table/${chatContextTable.tableName}`,
      ],
    });

    // Allow Lambda to read from SSM Parameter Store
    const ssmAPIEndpointKeyaPolicy = new iam.PolicyStatement({
      actions: ["secretsmanager:GetSecretValue"],
      resources: ["*"],
    });

    const documentsArtifactsHandlerRole = new cdk.aws_iam.Role(
      this,
      "GuruChatEnvDocumentsArtifactsHandlerRole",
      {
        description: "Role used by the Documents Artifacts Lambda function",
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    documentsArtifactsHandlerRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["*"],
        resources: ["*"],
      })
    );

    const apis = [
      {
        name: "ListDocuments",
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/fn-list-document",
        timeout: cdk.Duration.minutes(5),
        environment: {
          DYNAMODB_TABLE_NAME: documentTable.tableName,
        },
        routePath: "/api/document/list",
        methods: [apigwv2.HttpMethod.GET],
        memorySize: 2000,
        api: api.apiGatewayV2,
        role: documentsArtifactsHandlerRole,
        layers: [],
        arch: Architecture.X86_64,
      },
      {
        name: "AI21UltraModel",
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/fn-ai21-ultra-v1",
        timeout: cdk.Duration.minutes(5),
        environment: {
          DYNAMODB_TABLE_NAME: chatContextTable.tableName,
          S3_ASSETS_BUCKET_NAME: documentOutputLibraryBucket.bucketName,
          EMBEDDINGS_SAGEMAKER_ENDPOINT: "e5-largeV1",
        },
        routePath: "/api/ai21-ultra-v1",
        methods: [apigwv2.HttpMethod.POST],
        api: api.apiGatewayV2,
        memorySize: 8000,
        role: documentsArtifactsHandlerRole,
        layers: [bedrockLambdaLayer],
        arch: Architecture.ARM_64,
      },
    ];

    for (const val of apis) {
      new GuruApiPythonConstruct(this, val.name, {
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

    const fullAccessPolicy = new iam.PolicyStatement({
      actions: ["*"],
      resources: ["*"],
    });

    const temporaryDocumentBucket = new s3.Bucket(
      this,
      "GuruChatEnvTemporaryDocumentBucket",
      {
        versioned: false,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      }
    );

    const vpc = new ec2.Vpc(this, "MyVpc", { maxAzs: 2 });
    const securityGroup = new ec2.SecurityGroup(
      this,
      "GuruChatEnvSecurityGroup",
      {
        vpc,
        description: "guru foundations security group ecs task",
        allowAllOutbound: true,
      }
    );

    const taskRole = new iam.Role(this, "GuruChatEnvTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")
    );

    const executionRole = new iam.Role(this, "GuruChatEnvExecutionRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
    executionRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess")
    );

    const cluster = new ecs.Cluster(this, "GuruChatEnvEcsCluster", {
      vpc,
      containerInsights: true,
    });

    const taskDef = new ecs.FargateTaskDefinition(this, "GuruChatEnvTaskDef", {
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
      },
      cpu: 1024,
      memoryLimitMiB: 6144,
      taskRole: taskRole,
      executionRole: executionRole,
    });

    const logging = new ecs.AwsLogDriver({
      streamPrefix: "GuruChatEnvEcsLogging",
    });

    const dynamodbTableDocumentNameSecret = new secretsmanager.Secret(
      this,
      "GuruChatEnvDynamodbTableDocumentNameSecret",
      {
        secretName: "dynamodbTableDocumentNameSecret",
        description: "dynamodbTableDocumentNameSecret",
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            tableName: documentTable.tableName,
          }),
          generateStringKey: "tableNameSecret",
        },
      }
    );

    const container = taskDef.addContainer("GuruChatEnvContainer", {
      image: ecs.ContainerImage.fromAsset("../ecs_processing_task"),
      cpu: 1024,
      memoryLimitMiB: 4096,
      logging: logging,
    });

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Scan",
          "dynamodb:Query",
          "dynamodb:DeleteItem",
        ],
        resources: [
          `arn:aws:dynamodb:*:${awsAccountId}:table/${documentTable.tableName}`,
        ],
      })
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject",
        ],
        resources: [
          `arn:aws:s3:::${documentOutputLibraryBucket.bucketName}/*`,
          `arn:aws:s3:::${documentInputLibraryBucket.bucketName}/*`,
          `arn:aws:s3:::${temporaryDocumentBucket.bucketName}/*`,
        ],
      })
    );

    taskRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sagemaker:InvokeEndpoint"],
        resources: [
          `arn:aws:sagemaker:${awsRegion}:${awsAccountId}:endpoint/e5-largeV1`,
        ],
      })
    );

    const vectorDocumentHandlerFn = new lambdaPython.PythonFunction(
      this,
      "GuruChatEnvEcsTriggerTaskHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/sfn-trigger-ecs-task",
        timeout: cdk.Duration.minutes(15),
        retryAttempts: 0,
        memorySize: 1024,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          CLUSTER_NAME: cluster.clusterName,
          TASK_DEFINITION: taskDef.taskDefinitionArn,
          SUBNET_1: vpc.publicSubnets[0].subnetId,
          SUBNET_2: vpc.publicSubnets[1].subnetId,
          BUCKET_NAME: documentInputLibraryBucket.bucketName,
          S3_OUTPUT_ASSETS_BUCKET_NAME: documentOutputLibraryBucket.bucketName,
        },
      }
    );

    // Permission to run tasks on ECS
    const runTaskPermission = new iam.PolicyStatement({
      actions: ["ecs:RunTask"],
      resources: ["*"],
    });
    const s3ReadPermission = new iam.PolicyStatement({
      actions: ["*"],
      resources: ["*"],
    });

    vectorDocumentHandlerFn.addToRolePolicy(runTaskPermission);
    vectorDocumentHandlerFn.addToRolePolicy(fullAccessPolicy);
    vectorDocumentHandlerFn.addEventSource(
      new S3EventSource(temporaryDocumentBucket, {
        events: [
          s3.EventType.OBJECT_CREATED_PUT,
          s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
        ],
      })
    );

    const textractDocumentHandlerFn = new lambdaPython.PythonFunction(
      this,
      "GuruChatEnvTextractDocumentHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/sfn-extraction",
        timeout: cdk.Duration.minutes(15),
        retryAttempts: 0,
        memorySize: 1024,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          DYNAMODB_TABLE_NAME: documentTable.tableName,
          TEMPORARY_BUCKET_NAME: temporaryDocumentBucket.bucketName,
          EMBEDDINGS_SAGEMAKER_ENDPOINT_NAME: "e5-largeV1",
          S3_OUTPUT_ASSETS_BUCKET_NAME:
            documentOutputLibraryBucket.bucketDomainName,
        },
      }
    );

    textractDocumentHandlerFn.addToRolePolicy(fullAccessPolicy);

    vectorDocumentHandlerFn.addToRolePolicy(fullAccessPolicy);

    const stepFunctionErrorCatchHandlerFn = new lambdaPython.PythonFunction(
      this,
      "GuruChatEnvStepFunctionErrorCatchHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/sfn-error-handling",
        timeout: cdk.Duration.minutes(15),
        retryAttempts: 0,
        memorySize: 1024,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          DYNAMODB_TABLE_NAME: documentTable.tableName,
        },
      }
    );

    stepFunctionErrorCatchHandlerFn.addToRolePolicy(fullAccessPolicy);

    const checkEcsCompletionHandlerFn = new lambdaPython.PythonFunction(
      this,
      "GuruChatEnvCheckEcsCompletionHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/sfn-check-ecs",
        timeout: cdk.Duration.minutes(15),
        retryAttempts: 0,
        memorySize: 1024,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          ECS_CLUSTER_NAME: cluster.clusterName,
          CLUSTER_NAME: cluster.clusterName,
          TASK_DEFINITION: taskDef.taskDefinitionArn,
          SUBNET_1: vpc.publicSubnets[0].subnetId,
          SUBNET_2: vpc.publicSubnets[1].subnetId,
          BUCKET_NAME: documentInputLibraryBucket.bucketName,
          S3_OUTPUT_ASSETS_BUCKET_NAME:
            documentOutputLibraryBucket.bucketDomainName,
        },
      }
    );

    checkEcsCompletionHandlerFn.addToRolePolicy(fullAccessPolicy);

    const textractTask = new stepfunctionsTasks.LambdaInvoke(
      this,
      "Document Extraction",
      {
        lambdaFunction: textractDocumentHandlerFn,
        outputPath: "$.Payload",
      }
    );

    // Create a Step Function with the Lambda functions in a chain
    const vectorTask = new stepfunctionsTasks.LambdaInvoke(
      this,
      "Text Embedding",
      {
        lambdaFunction: vectorDocumentHandlerFn,
        outputPath: "$.Payload",
      }
    );

    const waitXSeconds = new stepfunctions.Wait(this, "Wait X Seconds", {
      time: stepfunctions.WaitTime.duration(cdk.Duration.seconds(30)),
    });

    const checkEcsCompletionTask = new stepfunctionsTasks.LambdaInvoke(
      this,
      "Check ECS Completion",
      {
        lambdaFunction: checkEcsCompletionHandlerFn,
        outputPath: "$.Payload",
      }
    );

    const errorState = new stepfunctionsTasks.LambdaInvoke(
      this,
      "Catch Error",
      {
        lambdaFunction: stepFunctionErrorCatchHandlerFn,
        payload: stepfunctions.TaskInput.fromObject({
          entirePayload: stepfunctions.JsonPath.entirePayload,
        }),
        outputPath: "$.Payload",
      }
    );

    const endState = new stepfunctions.Pass(this, "End State", {
      result: {
        value: "ECS task completed successfully.",
      },
    });

    const isDoneChoice = new stepfunctions.Choice(this, "Is ECS Task Done?");
    isDoneChoice.when(
      stepfunctions.Condition.booleanEquals("$.done", true),
      endState
    );
    isDoneChoice.otherwise(waitXSeconds);

    waitXSeconds.next(checkEcsCompletionTask);
    checkEcsCompletionTask.next(isDoneChoice);

    textractTask.addCatch(errorState, {
      resultPath: "$.errorInfo",
    });
    vectorTask.addCatch(errorState, {
      resultPath: "$.errorInfo",
    });

    const definition = textractTask.next(vectorTask).next(waitXSeconds);

    const logPipelineGroup = new logs.LogGroup(
      this,
      "GuruChatEnvStateMachineLogGroup"
    );

    const documentPipelineSfn = new stepfunctions.StateMachine(
      this,
      "GuruChatEnvDocumentPipelineSfn",
      {
        definition,
        timeout: cdk.Duration.minutes(60),
        tracingEnabled: true,
        logs: {
          destination: logPipelineGroup,
          level: stepfunctions.LogLevel.ALL,
        },
      }
    );

    const s3TriggerStepFunctionHandlerFn = new lambdaPython.PythonFunction(
      this,
      "GuruChatEnvS3TriggerStepFunctionHandlerFn",
      {
        runtime: Runtime.PYTHON_3_9,
        handler: "lambda_handler",
        index: "lambda_function.py",
        entry: "../api/sfn-trigger",
        timeout: cdk.Duration.minutes(15),
        retryAttempts: 0,
        memorySize: 1024,
        architecture: cdk.aws_lambda.Architecture.X86_64,
        environment: {
          STATE_MACHINE_ARN: documentPipelineSfn.stateMachineArn,
        },
      }
    );

    s3TriggerStepFunctionHandlerFn.addToRolePolicy(fullAccessPolicy);

    s3TriggerStepFunctionHandlerFn.addEventSource(
      new S3EventSource(documentInputLibraryBucket, {
        events: [
          s3.EventType.OBJECT_CREATED_PUT,
          s3.EventType.OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD,
        ],
      })
    );
  }
}
