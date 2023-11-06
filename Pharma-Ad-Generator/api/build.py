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
# --  Date:          04/11/2023
# --  Purpose:       Prepares the all the lambdas for deployment
# --  Version:       0.1.0
# --  Disclaimer:    This script is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

import os
import shutil
import sys
import subprocess

# Prepares the all the lambdas for deployment
#
# Walks each directory looking for a build script and executes it if found

build_file_name = "build.py"

dir_path = os.path.dirname(os.path.realpath(__file__))
build_file_name = os.path.basename(__file__)
exit_code = 0

for file in os.listdir(dir_path):
    folder_path = os.path.join(dir_path, file)
    if os.path.isdir(folder_path):
        build_file_path = os.path.join(folder_path, build_file_name)
        if os.path.exists(build_file_path):
            cmd = [sys.executable, build_file_path]
            proc = subprocess.run(cmd, stderr=subprocess.STDOUT) # nosec B603
            exit_code = exit_code + proc.returncode


exit(exit_code)
