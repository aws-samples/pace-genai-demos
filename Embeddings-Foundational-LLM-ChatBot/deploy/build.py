# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# Permission is hereby granted, free of charge, to any person obtaining a copy of this
# software and associated documentation files (the "Software"), to deal in the Software
# without restriction, including without limitation the rights to use, copy, modify,
# merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# --
# --  Author:        Jin Tan Ruan
# --  Linkedin:      https://www.linkedin.com/in/ztanruan
# --  Date:          04/11/2023
# --  Purpose:       Prepares the all the resources for deployment
# --  Version:       0.1.0
# --  Disclaimer:    This script is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

import os
import subprocess
import sys
import shutil


def exit_on_failure(exit_code, msg):
    if exit_code != 0:
        print(msg)
        exit(exit_code)


npm_cmd = shutil.which("npm")
npx_cmd = shutil.which("npx")

cmd = [npm_cmd, "install"]
proc = subprocess.run(cmd, stderr=subprocess.STDOUT)
exit_on_failure(proc.returncode, "Cdk npm install failed")

cmd = [npx_cmd, "cdk", "synth"]
proc = subprocess.run(cmd, stderr=subprocess.STDOUT)
exit_on_failure(proc.returncode, "Cdk synth failed")