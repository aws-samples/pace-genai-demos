# Contributing

## Build Infrastructure

Rules:

-   Build shall be cross-platform

Test:

-   Ensure that changes to the build infrastructure works on Linux and Windows by testing a build on both systems

## Deployment Infrastructure

Rules:

-   Deployment shall work without having to change any configuration or environment variables after copying the files into a new repository.
-   Deployment shall be cross-platform
-   Deployment shall be complete by running a single command `npm run deploy`

Test:

-   Changes to code that may work differently on different platforms need to be tested on both.
-   Changes to deploy cdk application need to ensure they work in both contexts (no-git & git)
    -   first deploy from a .git repo. Stacks should be (`BRANCH_NAME`, `BRANCH_NAME-waf`)
    -   then rename the .git folder and redeploy. The stack name should be the default (dev, dev-waf)
