/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SsmParameterReaderConstruct } from "./constructs/ssm-parameter-reader-construct";
import * as s3 from 'aws-cdk-lib/aws-s3';
import { AmplifyConfigLambdaConstruct } from "./constructs/amplify-config-lambda-construct";
import { ApiGatewayV2CloudFrontConstruct } from "./constructs/apigatewayv2-cloudfront-construct";
import { CloudFrontS3WebSiteConstruct } from "./constructs/cloudfront-s3-website-construct";
import { CognitoWebNativeConstruct } from "./constructs/cognito-web-native-construct";
import { ApiDef } from "./api-def";
import {KendraConstruct} from './constructs/kendra-construct';
import { RemovalPolicy } from "aws-cdk-lib";
import { Architecture, Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import * as lambdaPython from "@aws-cdk/aws-lambda-python-alpha";


export interface AppStackProps extends cdk.StackProps {
  readonly ssmWafArnParameterName: string;
  readonly ssmWafArnParameterRegion: string;
}

/**
 * AppStack for an S3 website and api gatewayv2 proxied through a CloudFront distribution
 *
 */
export class AppStack extends cdk.Stack {
  private awsRegion:string;
  private awsAccountId:string;
  private chatMessageHistoryTable:cdk.aws_dynamodb.Table;
  private syncRunTable:cdk.aws_dynamodb.Table;
  private chatHandlerRole: cdk.aws_iam.Role;
  private listSyncRunRole: cdk.aws_iam.Role;
  private kendraIndexId: string;
  private kendraDataSourceIndexId: string;
  private docProcessingStateMachine: cdk.aws_stepfunctions.StateMachine;
  private stepFunctionsExecutionHandlerRole:cdk.aws_iam.Role;
  private boto3LambdaLayer: LayerVersion;
  private kendraAclHandlerRole: cdk.aws_iam.Role;
  private documentsArtifactsTable: cdk.aws_dynamodb.Table;
  private documentsArtifactsHandlerRole: cdk.aws_iam.Role;
  private bedRockLambdaLayer: LayerVersion;
  private kendraInputBucketArn: string;
  private kendraCt: KendraConstruct;
  private cognito: CognitoWebNativeConstruct;
  private chatFunctionUrl: cdk.aws_lambda.FunctionUrl;

  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    const webAppBuildPath = "../web-app/build";
    this.awsAccountId = cdk.Stack.of(this).account;
    this.awsRegion = cdk.Stack.of(this).region;

    let kendraInputBucket = new s3.Bucket(this, 'kendraInputBucket', {
      accessControl: s3.BucketAccessControl.PRIVATE,
      enforceSSL: true,
      eventBridgeEnabled: true
    });
    this.kendraInputBucketArn = kendraInputBucket.bucketArn

    kendraInputBucket.addCorsRule({
      allowedOrigins: ['*'],
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.DELETE, s3.HttpMethods.HEAD],
      allowedHeaders: ['*'],
      exposedHeaders: ["ETag"], // For Storage Put with Object size > 5MB
      maxAge: 3000,
    });

    this.cognito = new CognitoWebNativeConstruct(this, "Cognito", {
      kendraIndexInputBucketArn: kendraInputBucket.bucketArn
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
      userPool: this.cognito.userPool,
      userPoolClient: this.cognito.webClientUserPool,
    });

   

    const kendraACL = [
      {
          "keyPrefix":`s3://${kendraInputBucket.bucketName}/public/BusinessTeam1/`,
          "aclEntries": [
              {
                  "Name": "BusinessTeam1",
                  "Type": "GROUP",
                  "Access": "ALLOW"
              },
            {
                  "Name": "Admin",
                  "Type": "GROUP",
                  "Access": "ALLOW"
            }
          ]
      },
      {
          "keyPrefix": `s3://${kendraInputBucket.bucketName}/public/BusinessTeam2/`,
          "aclEntries": [
              {
                  "Name": "BusinessTeam2",
                  "Type": "GROUP",
                  "Access": "ALLOW"
              },
            {
                  "Name": "Admin",
                  "Type": "GROUP",
                  "Access": "ALLOW"
            }
          ]
      },
      {
          "keyPrefix": `s3://${kendraInputBucket.bucketName}/public/AdminsOnly/`,
          "aclEntries": [
            {
                  "Name": "Admin",
                  "Type": "GROUP",
                  "Access": "ALLOW"
            }
          ]
      }
  ]

   
    const kendraAclUploader = new AwsCustomResource(this, 'kendraAclUploader', {
      onUpdate: {
        action: 'putObject',
        parameters: {
          Body: JSON.stringify(kendraACL),
          Bucket: kendraInputBucket.bucketName,
          CacheControl: 'max-age=0, no-cache, no-store, must-revalidate',
          ContentType: 'application/json',
          Key: 'kendra_acl.json',
        },
        physicalResourceId: PhysicalResourceId.of('kendra_acl'),
        service: 'S3',
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ['s3:PutObject'],
          resources: [kendraInputBucket.arnForObjects('kendra_acl.json')],
        }),
      ]),
    });


    // Create Kendra Index and Data Source
    this.kendraCt = new KendraConstruct(this, "llmDemoIndex", {
      IndexName: "llmDemoKendraIndex",
      Edition: 'DEVELOPER_EDITION',
      kendraDataSyncInputBucketName: kendraInputBucket.bucketName,
      CognitoUserPoolId: this.cognito.userPool.userPoolId
    })

    new cdk.CfnOutput(this, 'KendraAccessControlListUrl', {
      value: `s3://${kendraInputBucket.bucketName}/kendra_acl.json`
    });

    // We set an explicit dependency here to ensure that the Kendra ACL File already exists 
    // at the root of S3 Bucket before a S3 DataConnector is created within Kendra
    this.kendraCt.node.addDependency(kendraAclUploader)
    
    this.kendraIndexId = this.kendraCt.KendraIndexId;
    this.kendraDataSourceIndexId = this.kendraCt.KendraDataSourceIndexId

    this.createSyncRunTable();
    this.createDocumentsTable();
    this.createChatMessageHistoryTable();
    this.createChatHandlerRole();
    this.createListSyncRunsHandlerRole();
    this.createKendraWorkflowStepFunction();
    this.createStepFunctionsExecutionHandlerRole();
    this.createKendraAclLambdaHandlerRole(kendraInputBucket.bucketName);
    this.createDocumentsArtifactsLambdaHandlerRole();
    this.createLambdaLayer()
    this.createChatHandlerLambda()

    // REST APIs
    const apidef = new ApiDef(this, {
      cognito: this.cognito,
      api: api,
      createChatHandlerRole:this.chatHandlerRole,
      KendraIndexId: this.kendraCt.KendraIndexId,
      KendraDataSourceIndexId: this.kendraCt.KendraDataSourceIndexId,
      chatMessageHistoryTableName: this.chatMessageHistoryTable.tableName,
      listSyncRunsHandlerRole:this.listSyncRunRole,
      syncRunsTableName: this.syncRunTable.tableName,
      docProcessingStateMachineArn: this.docProcessingStateMachine.stateMachineArn,
      stepFunctionsExecutionHandlerRole: this.stepFunctionsExecutionHandlerRole,
      kendraIngestionBucketName: kendraInputBucket.bucketName,
      kendraAclExecutionHandlerRole: this.kendraAclHandlerRole,
      documentsArtifactsTableName: this.documentsArtifactsTable.tableName,
      documentsArtifactsHandlerRole: this.documentsArtifactsHandlerRole,
      bedRockLambdaLayer: this.bedRockLambdaLayer
    }) 

    new AmplifyConfigLambdaConstruct(this, "AmplifyConfigFn", {
      api: api.apiGatewayV2,
      appClientId: this.cognito.webClientId,
      identityPoolId: this.cognito.identityPoolId,
      userPoolId: this.cognito.userPoolId,
      functionUrl: this.chatFunctionUrl.url
    });


    new cdk.CfnOutput(this, 'KendraDataSyncS3Bucket', {
      value: kendraInputBucket.bucketName
    });
  }


  private createLambdaLayer(){
      // Creating the Lambda Layer
    this.bedRockLambdaLayer = new LayerVersion(this, 'bedRockLangChainKendraRetriveLayer', {
        compatibleRuntimes: [ Runtime.PYTHON_3_10 ],
        compatibleArchitectures: [ Architecture.X86_64 ],
        code: Code.fromAsset('../lambda-layer/python-bedrock-langchain-layer.zip')
    })
  }

  private createChatHandlerLambda(){

      const chatHandlerLambda = new lambdaPython.PythonFunction(
        this,
        "chatHandlerLambdaFn",
        {
            runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
            handler: "lambda_handler",
            index: "lambda_function.py",
            entry: "../api/chat-handler",
            timeout: cdk.Duration.seconds(180),
            environment: {
                'KENDRA_INDEX_ID': this.kendraCt.KendraIndexId,
                'CHAT_MESSAGE_HISTORY_TABLE_NAME': this.chatMessageHistoryTable.tableName,
                'AWS_INTERNAL': "False",
                'NO_OF_PASSAGES_PER_PAGE': "10",
                'NO_OF_SOURCES_TO_LIST': "3"
            },
            architecture: Architecture.X86_64,
            role: this.chatHandlerRole,
            layers: [this.bedRockLambdaLayer]
        }
      );
      
      chatHandlerLambda.addPermission("PermissionForInvokingFunction", {
        principal: this.cognito.authenticatedRole,
        action: "lambda:InvokeFunctionUrl",
      });

      this.chatFunctionUrl = chatHandlerLambda.addFunctionUrl({
        authType: cdk.aws_lambda.FunctionUrlAuthType.AWS_IAM,
        cors: {
            allowedOrigins: ["*"],
            allowedMethods: [cdk.aws_lambda.HttpMethod.GET, cdk.aws_lambda.HttpMethod.POST],
            allowCredentials: false,
            maxAge: cdk.Duration.minutes(2),
            exposedHeaders: ["access-control-allow-origin"],
            allowedHeaders: [
                "authorization",
                "content-type",
                "origin",
                "x-amz-date",
                "x-api-key",
                "x-amz-security-token",
                "x-amz-user-agent",
            ],
        },
      });

      new cdk.CfnOutput(this, "ChatHandlerUrl", {
        value: this.chatFunctionUrl.url,
      });
    }

  private createDocumentsTable(){
    this.documentsArtifactsTable = new cdk.aws_dynamodb.Table(this, "DocumentArtifacts", {
      partitionKey: { name: "DocId", type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: "CreatedOn", type: cdk.aws_dynamodb.AttributeType.STRING },
      encryption: cdk.aws_dynamodb.TableEncryption.AWS_MANAGED,
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    this.documentsArtifactsTable.addGlobalSecondaryIndex({
      indexName: "KEY_PREFIX_CREATED_ON_INDEX",
      partitionKey: { name: "KeyPrefix", type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: "CreatedOn", type: cdk.aws_dynamodb.AttributeType.STRING },
      projectionType: cdk.aws_dynamodb.ProjectionType.ALL
    })
  }

  private createSyncRunTable(){
    this.syncRunTable = new cdk.aws_dynamodb.Table(this, "SyncRunTable", {
      partitionKey: { name: "Id", type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: "CreatedOn", type: cdk.aws_dynamodb.AttributeType.STRING },
      encryption: cdk.aws_dynamodb.TableEncryption.AWS_MANAGED,
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });
  }

  private createKendraAclLambdaHandlerRole(kendraInputBucket: string){
    this.kendraAclHandlerRole = new cdk.aws_iam.Role(
      this,
      "kendraAclHandlerRole",
      {
        description: "Role used by the Kendra ACL API Handler Lambda function",
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    this.kendraAclHandlerRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    this.kendraAclHandlerRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [`arn:aws:s3:::${kendraInputBucket}/kendra_acl.json`],
      })
    );
  }


  private createDocumentsArtifactsLambdaHandlerRole(){
    this.documentsArtifactsHandlerRole = new cdk.aws_iam.Role(
      this,
      "documentsArtifactsHandlerRole",
      {
        description: "Role used by the Documents Artifacts Lambda function",
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    this.documentsArtifactsHandlerRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    this.documentsArtifactsHandlerRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["dynamodb:Scan", "dynamodb:GetItem", "dynamodb:Query", "dynamodb:PutItem", "dynamodb:UpdateItem"],
        resources: [this.documentsArtifactsTable.tableArn],
      })
    );
  }

  private createStepFunctionsExecutionHandlerRole(){
    this.stepFunctionsExecutionHandlerRole = new cdk.aws_iam.Role(
      this,
      "stepFunctionsExecutionHandlerRole",
      {
        description: "Role used by the stepFunctionsExecutionHandlerFn Lambda function",
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );
    this.stepFunctionsExecutionHandlerRole.node.addDependency(this.docProcessingStateMachine)

    this.stepFunctionsExecutionHandlerRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    this.stepFunctionsExecutionHandlerRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["states:StartExecution"],
        resources: [
          this.docProcessingStateMachine.stateMachineArn
        ],
      })
    );
  }

  private createChatMessageHistoryTable(){
    this.chatMessageHistoryTable = new cdk.aws_dynamodb.Table(this, "ChatMessageHistory", {
      partitionKey: { name: "SessionId", type: cdk.aws_dynamodb.AttributeType.STRING },
      encryption: cdk.aws_dynamodb.TableEncryption.AWS_MANAGED,
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY
    });

    this.chatMessageHistoryTable.addGlobalSecondaryIndex({
      indexName: "USER_SESSION_START_INDEX",
      partitionKey: { name: "User", type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: "SessionStartTime", type: cdk.aws_dynamodb.AttributeType.STRING },
      projectionType: cdk.aws_dynamodb.ProjectionType.ALL
    })
  }

  private createListSyncRunsHandlerRole(){
    this.listSyncRunRole = new cdk.aws_iam.Role(
      this,
      "listSyncRunRole",
      {
        description: "Role used by the List Documents Lambda function",
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    this.listSyncRunRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    this.listSyncRunRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["dynamodb:Scan", "dynamodb:GetItem", "dynamodb:Query"],
        resources: [this.syncRunTable.tableArn],
      })
    );

  }

  private createChatHandlerRole(){
    this.chatHandlerRole = new cdk.aws_iam.Role(
      this,
      "chatHandlerRole",
      {
        description: "Role used by the ChatHandler Lambda function",
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    this.chatHandlerRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    this.chatHandlerRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
      actions: ["dynamodb:Put*","dynamodb:Get*","dynamodb:List*","dynamodb:Query","dynamodb:Update*"],
      resources: [
          `${this.chatMessageHistoryTable.tableArn}`,
      ],
    }))

    this.chatHandlerRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
      actions: ["kendra:Query", "kendra:Retrieve"],
      resources: [
        `arn:aws:kendra:${this.awsRegion}:${this.awsAccountId}:index/${this.kendraIndexId}`,
      ],
    }))


     this.chatHandlerRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
      actions: ["s3:GetObject"],
      resources: [`${this.kendraInputBucketArn}`,`${this.kendraInputBucketArn}/*`]
    }))

    this.chatHandlerRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
      actions: ["bedrock:InvokeModel"],
      resources: [
        `arn:aws:bedrock:${this.awsRegion}::foundation-model/*` // Need access to all Foundational Models
      ],
    }))
  }


  private createCheckJobsStatusFn(): cdk.aws_lambda.Function{

    const checkJobStatusRole = new cdk.aws_iam.Role(
      this,
      "textTractLambdaRole",
      {
        description: "Role used by the Text Extract Lambda function",
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    checkJobStatusRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    checkJobStatusRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["kendra:ListDataSourceSyncJobs"],
        resources: [`arn:aws:kendra:${this.awsRegion}:${this.awsAccountId}:index/${this.kendraIndexId}`],
      })
    );
    checkJobStatusRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["kendra:ListDataSourceSyncJobs"],
        resources: [`arn:aws:kendra:${this.awsRegion}:${this.awsAccountId}:index/${this.kendraIndexId}/data-source/${this.kendraDataSourceIndexId}`],
      })
    );


    return new cdk.aws_lambda.Function(
      this,
      "checkJobStatusFN",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
        handler: 'check_sync_status.lambda_handler',
        code: cdk.aws_lambda.Code.fromAsset("../lambdas/kendra_sync_status"),
        timeout: cdk.Duration.seconds(60),
        memorySize: 256,
        role: checkJobStatusRole,
        environment:{
          KENDRA_INDEX_ID: this.kendraIndexId,
          KENDRA_DATA_SOURCE_INDEX_ID: this.kendraDataSourceIndexId,
          DOCUMENTS_TABLE: this.syncRunTable.tableName
        }
      }
    );
  }

  private createKendraStartDataSync(): cdk.aws_lambda.Function{
    
    let startDataSyncRole = new cdk.aws_iam.Role(
      this,
      "startDataSyncRole",
      {
        description: "Role used by the Document Status Update Lambda function",
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    startDataSyncRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    startDataSyncRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["dynamodb:PutItem", "dynamodb:Query", "dynamodb:GetItem", "dynamodb:UpdateItem"],
        resources: [this.syncRunTable.tableArn],
      })
    );

    startDataSyncRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
      actions: ["kendra:StartDataSourceSyncJob"],
      resources: [
          `arn:aws:kendra:${this.awsRegion}:${this.awsAccountId}:index/${this.kendraIndexId}`,
          `arn:aws:kendra:${this.awsRegion}:${this.awsAccountId}:index/${this.kendraIndexId}/data-source/${this.kendraDataSourceIndexId}`,
      ],
    }))

    return new cdk.aws_lambda.Function(
      this,
      "kendraStartDataSync",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
        handler: "start_sync.lambda_handler",
        code: cdk.aws_lambda.Code.fromAsset("../lambdas/kendra_sync"),
        timeout: cdk.Duration.seconds(30),
        role: startDataSyncRole,
        environment: {
          KENDRA_INDEX_ID: this.kendraIndexId,
          KENDRA_DATA_SOURCE_INDEX_ID: this.kendraDataSourceIndexId,
          DOCUMENTS_TABLE: this.syncRunTable.tableName
        },
      }
    );
  }

  private createUpdateKendraJobStatusFn(): cdk.aws_lambda.Function{

    let updateKendraJobStatusRole = new cdk.aws_iam.Role(
      this,
      "updateKendraJobStatus",
      {
        description: "Role used by the Document Status Update Lambda function",
        assumedBy: new cdk.aws_iam.ServicePrincipal("lambda.amazonaws.com"),
      }
    );

    updateKendraJobStatusRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    updateKendraJobStatusRole.addToPolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ["dynamodb:PutItem", "dynamodb:Query", "dynamodb:GetItem", "dynamodb:UpdateItem"],
        resources: [this.syncRunTable.tableArn],
      })
    );

    return new cdk.aws_lambda.Function(
      this,
      "updateKendraJobStatusFn",
      {
        runtime: cdk.aws_lambda.Runtime.PYTHON_3_10,
        handler: "update_job_status.lambda_handler",
        code: cdk.aws_lambda.Code.fromAsset("../lambdas/kendra_job_mgr"),
        timeout: cdk.Duration.seconds(30),
        role: updateKendraJobStatusRole,
        environment: {
          DOCUMENTS_TABLE: this.syncRunTable.tableName
        },
      }
    );
  }

  private createKendraWorkflowStepFunction(){

    const updateKendraJobStatusFn = this.createUpdateKendraJobStatusFn();

    const docProcessingLogGroup = new cdk.aws_logs.LogGroup(this, "DocProcessingStateMachineLog", {
      removalPolicy: RemovalPolicy.DESTROY,
    });

 
    const waitFor30Secs = new cdk.aws_stepfunctions.Wait(this, 'Wait 30 Seconds', {
      time: cdk.aws_stepfunctions.WaitTime.duration(cdk.Duration.seconds(30))
    });

    const getKendraJobStatus = new cdk.aws_stepfunctions_tasks.LambdaInvoke(this, 'Get Textract Job Status', {
      lambdaFunction: this.createCheckJobsStatusFn(),
      // Lambda's result in a field called "status" in the response
      outputPath: '$.Payload',
    });

    // Step function Def
    const docProcessingDefinition = new cdk.aws_stepfunctions_tasks.LambdaInvoke(
        this,
        "Starts a new Kendra Data Sync Job",
        {
          lambdaFunction: this.createKendraStartDataSync(),
          outputPath: "$.Payload",
        }
      )
      .next(getKendraJobStatus)
      .next(new cdk.aws_stepfunctions.Choice(this, "Kendra DataSync Job Complete?")
        .when(cdk.aws_stepfunctions.Condition.stringEquals('$.KendraJobStatus', 'FAILED'), 
        new cdk.aws_stepfunctions_tasks.LambdaInvoke(
          this,
          "Update Document Status as Failure",
          {
            lambdaFunction: updateKendraJobStatusFn,
            outputPath: "$.Payload",
          }
        ))
        .when(cdk.aws_stepfunctions.Condition.stringEquals('$.KendraJobStatus', 'ABORTED'), 
        new cdk.aws_stepfunctions_tasks.LambdaInvoke(
          this,
          "Update Document Status as Aborted",
          {
            
            lambdaFunction: updateKendraJobStatusFn,
            outputPath: "$.Payload",
          }
        ))
        .when(cdk.aws_stepfunctions.Condition.stringEquals('$.KendraJobStatus', 'INCOMPLETE'), 
        new cdk.aws_stepfunctions_tasks.LambdaInvoke(
          this,
          "Update Document Status as Incomplete",
          {
            lambdaFunction: updateKendraJobStatusFn,
            outputPath: "$.Payload",
          }
        ))
        .when(cdk.aws_stepfunctions.Condition.stringEquals('$.KendraJobStatus', 'SUCCEEDED'),
            new cdk.aws_stepfunctions_tasks.LambdaInvoke(
              this,
              "Update Document Status as Completed",
              {
                lambdaFunction: updateKendraJobStatusFn,
                outputPath: "$.Payload",
              }
            )
          )
        .otherwise(waitFor30Secs.next(getKendraJobStatus))
      )

      this.docProcessingStateMachine = new cdk.aws_stepfunctions.StateMachine(
        this,
        "DocProcessingStateMachine",
        {
          definition: docProcessingDefinition,
          tracingEnabled: true,
          logs: {
            destination: docProcessingLogGroup,
            level: cdk.aws_stepfunctions.LogLevel.ALL,
          },
        }
      );
  }

}
