# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import os
import subprocess
import sys
import shutil


def exit_on_failure(exit_code, msg):
    if exit_code != 0:
        print(msg)
        exit(exit_code)

npm_cmd = shutil.which("npm")
cmd = [npm_cmd, "install"]
proc = subprocess.run(cmd, stderr=subprocess.STDOUT) # nosec B603
exit_on_failure(proc.returncode, "Web app npm install failed")

cmd = [npm_cmd, "run", "build"]
proc = subprocess.run(cmd, stderr=subprocess.STDOUT) # nosec B603
exit_on_failure(proc.returncode, "Web app build failed")