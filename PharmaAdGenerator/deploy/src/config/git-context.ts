// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as path from "path";
import gitBranch from "git-branch";
import * as fs from "fs";

/**
 * Gets branch name and repository name from git configuration.  Returns branch name, repo name and app stack name
 */
export const getGitContext = () => {
    const defaultNameIfGitIsMissing = "dev";

    const findDirUp = (directoryName: string): string => {
        let cwd = process.cwd();
        // while not the file system root (linux & windows)
        while (!(cwd === "/" || cwd === "C:\\")) {
            const directories = fs.readdirSync(cwd);
            if (directories.filter((dir) => dir === directoryName).length > 0) {
                return cwd;
            } else {
                cwd = path.join(cwd, "../");
            }
        }
        console.log("GetContext: No .git parent directory found.");
        return "";
    };

    const gitDirectory = findDirUp(".git");
    // if no git directory is found then default to something sensible
    const currentGitBranch = gitDirectory
        ? gitBranch.sync(gitDirectory)
        : defaultNameIfGitIsMissing;
    // replaces special characters with - and truncates to 122 characters.  128 is the max for CloudFormation.
    // This name is used below for the CICD stack name which appends an additional 5 characters.
    const appStackName = currentGitBranch.replace(/[^\w\s]/gi, "-").substring(0, 122);

    return {
        currentGitBranch,
        appStackName,
    };
};
