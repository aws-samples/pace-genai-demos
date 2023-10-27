/**
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
*/

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface VpcConstructProps extends cdk.StackProps {
    /**
     * The CIDR range to use for the VPC, e.g. '10.0.0.0/20'
     * Should be a minimum of /28 and maximum size of /16. The range will be split across all subnets per Availability Zone.
     *
     * @default 10.0.0.0/20 which covers 2 subnets per az up to 6 az's when using 24 as CidrMask
     */
    readonly cidr?: string;

    /**
     * The number of NAT Gateways/Instances to create.
     * Should be equal to or less than maxAzs.  Lower number saves money and EIP's
     *
     * @default 2
     */
    readonly natGateways?: number;

    /**
     * Configure the subnets to build for each AZ.
     *
     * @default 2
     */
    readonly maxAzs?: number;

    /**
     * The number of leading 1 bits in the routing mask for the public subnet.
     *
     * @default 24
     */
    readonly publicCidrMask?: number;

    /**
     * The number of leading 1 bits in the routing mask for the public subnet.
     *
     * @default 24
     */
    readonly privateCidrMask?: number;

    /**
     * Attaches an S3 Gateway endpoint into the VPC.  Set to false if you don't use S3
     *
     * @default true
     */
    readonly hasS3GatewayEndpoint?: boolean;

    /**
     * Attaches a DynamoDB Gateway endpoint into the VPC.  Set to false if you don't use DynamoDB
     *
     * @default true
     */
    readonly hasDynamoDbGatewayEndpoint?: boolean;
}

const defaultProps: Partial<VpcConstructProps> = {
    cidr: "10.0.0.0/20",
    natGateways: 2,
    maxAzs: 2,
    publicCidrMask: 24,
    privateCidrMask: 24,
    hasS3GatewayEndpoint: true,
    hasDynamoDbGatewayEndpoint: true,
};

/**
 * Creates a VPC with a public and private shared subnet.
 *
 * The default VPC has a large address range to support additional private subnets for each app deployed into the VPC.
 * App deployments can either deploy into the SharedPublic/SharedPrivate or create separate
 * private subnets for each deployment.  App subnets should be attached in the application stack.
 */
export class VpcConstruct extends Construct {
    public readonly vpc: cdk.aws_ec2.IVpc;

    constructor(parent: Construct, name: string, props: VpcConstructProps) {
        super(parent, name);

        props = { ...defaultProps, ...props };

        // see for transition to IPAMPool allocations. It's a solution for having to define specific blocks for subnets
        // - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IpAddresses.html
        // - https://docs.aws.amazon.com/vpc/latest/ipam/allocate-cidrs-ipam.html

        const vpc = new cdk.aws_ec2.Vpc(this, "Vpc", {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            ipAddresses: cdk.aws_ec2.IpAddresses.cidr(props.cidr!),
            natGateways: props.natGateways,
            maxAzs: props.maxAzs,
            subnetConfiguration: [
                {
                    name: "PublicShared",
                    subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
                    cidrMask: props.publicCidrMask,
                },
                {
                    name: "PrivateShared",
                    subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidrMask: props.privateCidrMask,
                },
            ],
        });

        // add S3 private gateway endpoint
        if (props.hasS3GatewayEndpoint) {
            vpc.addGatewayEndpoint("S3GatewayEndpoint", {
                service: cdk.aws_ec2.GatewayVpcEndpointAwsService.S3,
            });
        }

        // attach dynamodb gateway endpoint
        if (props.hasDynamoDbGatewayEndpoint) {
            vpc.addGatewayEndpoint("DynamoDbGatewayEndpoint", {
                service: cdk.aws_ec2.GatewayVpcEndpointAwsService.DYNAMODB,
            });
        }

        const vpcIdParameter = new cdk.aws_ssm.StringParameter(this, "VpcIdParameter", {
            parameterName: "vpc-id",
            stringValue: vpc.vpcId,
        });

        //Outputs
        new cdk.CfnOutput(this, `Id`, {
            value: vpc.vpcId,
        });

        this.vpc = vpc;
    }
}
