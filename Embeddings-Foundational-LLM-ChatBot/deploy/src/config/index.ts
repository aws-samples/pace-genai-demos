// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0


import { getGitContext } from "./git-context";

// returns configuration provider functions by name
export const getConfigProvider = (configType: "git") => {
    switch (configType) {
        case "git":
            return getGitContext;

        default:
            throw new Error(`Config provider ${configType} does not exist. Please choose another`);
    }
};
