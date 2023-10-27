/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

export interface OpenSearchConstructProps extends cdk.StackProps {
    readonly vpc: cdk.aws_ec2.IVpc;
}

const defaultProps: Partial<OpenSearchConstructProps> = {};

/**
 * Deploys the OpenSearch cluster in a given VPC.
 * This contruct imples usage of [service-linked roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/using-service-linked-roles.html)
 * in order to create one for service-linked roles run the folloing snipplet,
 * the snippet is mean to be executed only once, before you deploy the CDK stack
 * @example
 * aws iam create-service-linked-role --aws-service-name es.amazonaws.com
 */
export class OpenSearchConstruct extends Construct {
    public readonly domain: cdk.aws_opensearchservice.Domain;

    constructor(parent: Construct, name: string, props: OpenSearchConstructProps) {
        super(parent, name);

        props = { ...defaultProps, ...props };

        const stack = cdk.Stack.of(this);

        const slowSearchLogGroup = new cdk.aws_logs.LogGroup(this, "SlowSearchLogGroup", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const slowIndexLogGroup = new cdk.aws_logs.LogGroup(this, "SlowIndexLogGroup", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const appLogGroup = new cdk.aws_logs.LogGroup(this, "AppLogGroup", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.domain = new cdk.aws_opensearchservice.Domain(this, "SearchDomain", {
            domainName: stack.stackName,
            enableVersionUpgrade: true,
            version: cdk.aws_opensearchservice.EngineVersion.openSearch("2.5"),
            vpc: props.vpc,
            vpcSubnets: [
                {
                    subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
            ],
            useUnsignedBasicAuth: false,
            enforceHttps: true,
            capacity: {
                masterNodes: 3,
                masterNodeInstanceType: "r6g.large.search",
                dataNodes: 4,
                dataNodeInstanceType: "c6g.4xlarge.search",
            },
            ebs: {
                // https://docs.aws.amazon.com/opensearch-service/latest/developerguide/sizing-domains.html
                volumeSize: 50,
                volumeType: cdk.aws_ec2.EbsDeviceVolumeType.GENERAL_PURPOSE_SSD_GP3,
            },
            zoneAwareness: {
                enabled: true,
            },
            logging: {
                slowSearchLogEnabled: true,
                slowSearchLogGroup: slowSearchLogGroup,
                appLogEnabled: true,
                appLogGroup: appLogGroup,
                slowIndexLogEnabled: true,
                slowIndexLogGroup: slowIndexLogGroup,
            },
            nodeToNodeEncryption: true,
            encryptionAtRest: {
                enabled: true,
            },
            // fineGrainedAccessControl: {
            //     masterUserName: "admin",
            // },

            // removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // add access policy
        this.domain.addAccessPolicies(
            new cdk.aws_iam.PolicyStatement({
                actions: ["es:*"],
                effect: cdk.aws_iam.Effect.ALLOW,
                principals: [new cdk.aws_iam.AccountPrincipal(stack.account)],
                resources: [this.domain.domainArn, `${this.domain.domainArn}/*`],
            })
        );

        //Outputs
        new cdk.CfnOutput(this, `DomainEndpoint`, {
            value: this.domain.domainEndpoint,
        });

        //Outputs
        new cdk.CfnOutput(this, `DomainArn`, {
            value: this.domain.domainArn,
        });
    }
}
