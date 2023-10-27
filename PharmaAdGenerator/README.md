# Guru Pharma Ad

This demo showcases how to leverage the power of generative AI to craft localized pharma ads from source images and PDFs. Beyond merely speeding up the ad generation process, this approach streamlines the Medical Legal Review (MLR) process. MLR is a rigorous review mechanism in which medical, legal, and regulatory teams meticulously evaluate promotional materials to guarantee their accuracy, scientific backing, and regulatory compliance.

This demo supports the following Amazon Bedrock foundational base LLM Models.

- Anthropic - Claude V2
- Anthropic - Claude V1
- AI21 - Jurassic-2 Ultra
- AI21 - Jurassic-2 Mid
- Stability AI - Stable Difussion XL

## Prerequisites

1. NodeJs >= 16.10.0
2. Python3 >= 3.10
3. Docker
4. AWS CLI >= 2.0.0 configured with `default` profile using credentials from the corresponding AWS Account where this prototype needs to be deployed.

## Deployment

:information_source: **The deployment time ranges from 15-20 minutes.**

The instructions assume that this solution will be deployed from a terminal running from Linux or MacOS. The instructions should also work from a POSIX terminal running from Windows, assuming that it includes the standard GNU tools.
Run the following commands at the root of the repo

```bash
    chmod +x deploy.sh
    ./deploy.sh
```

## Getting started

After the deployment is successful, follow these steps to get started on using the Chatbot

1. Create a Cognito user - Run the following code to create a user within the Cognito UserPool. Refer to the output section of Cloudformation stack named **guru-pharma-ad**
   to get the value of the **CognitoUserPoolId** key. Be sure to replace the parameter values before running the commands.

```bash
    chmod +x create-new-user.sh
    ./create-new-user.sh USER_POOL_ID USERNAME PASSWORD
```

2. Login to the App. You will find the App Cloudfront URL in the output section of Cloudformation stack named **guru-pharma-ad**.

3. You are all set. You are now able to interact with the Pharma Ad Studio. You can upload documents and images and choose the LLM models from the drop down menu to generate the new ad.
