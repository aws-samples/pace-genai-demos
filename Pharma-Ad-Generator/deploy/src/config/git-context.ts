// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

// Permission is hereby granted, free of charge, to any person obtaining a copy of this
// software and associated documentation files (the "Software"), to deal in the Software
// without restriction, including without limitation the rights to use, copy, modify,
// merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// --
// --  Author:        Jin Tan Ruan
// --  Date:          04/11/2023
// --  Purpose:       Git Context
// --  Version:       0.1.0
// --  Disclaimer:    This code is provided "as is" in accordance with the repository license
// --  History
// --  When        Version     Who         What
// --  -----------------------------------------------------------------
// --  04/11/2023  0.1.0       jtanruan    Initial
// --  -----------------------------------------------------------------
// --

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
  const appStackName = currentGitBranch
    .replace(/[^\w\s]/gi, "-")
    .substring(0, 122);

  return {
    currentGitBranch,
    appStackName,
  };
};
