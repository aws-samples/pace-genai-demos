// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

/**
 * Helper function to attach the waf to an apigatewayv2 http api
 * @param parent
 * @param name
 * @param webAcl
 * @param apigwv2
 * @returns
 */
export function attachWafV2ToLoadBalancer(
    /**
     * Parent construct to assign the association to.
     */
    parent: Construct,

    /**
     * Name of the construct
     */
    name: string,

    /**
     * WafV2 WebAcl
     */
    webAcl: cdk.aws_wafv2.CfnWebACL,

    /**
     * load balancer to attach the web acl to
     */
    loadBalancer: cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer,
) {
    return new cdk.aws_wafv2.CfnWebACLAssociation(parent, name, {
        webAclArn: webAcl.attrArn,
        resourceArn: loadBalancer.loadBalancerArn,
    });
}
