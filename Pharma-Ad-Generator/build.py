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
import argparse


def exit_on_failure(exit_code, msg):
    if exit_code != 0:
        print(msg)
        exit(exit_code)


def change_dir_with_return(dir):
    current_dir = os.getcwd()
    os.chdir(dir)
    return lambda: os.chdir(current_dir)


def build_api():

    return_dir = change_dir_with_return("./api")

    cmd = [sys.executable, "build.py"]
    proc = subprocess.run(cmd, stderr=subprocess.STDOUT) # nosec B603
    exit_on_failure(proc.returncode, "Api build failed")

    return_dir()


def build_web_app():

    return_dir = change_dir_with_return("./web-app")
    cmd = [sys.executable, "build.py"]
    proc = subprocess.run(cmd, stderr=subprocess.STDOUT) # nosec B603
    exit_on_failure(proc.returncode, "Web app build failed")

    return_dir()


def build_deploy():
    return_dir = change_dir_with_return("./deploy")
    cmd = [sys.executable, "build.py"]
    proc = subprocess.run(cmd, stderr=subprocess.STDOUT) # nosec B603
    exit_on_failure(proc.returncode, "Deploy build failed")

    return_dir()


def main():
    parser = argparse.ArgumentParser(
        description="Builds parts or all of the solution.  If no arguments are passed then all builds are run"
    )
    parser.add_argument("--web", action="store_true", help="builds web app")
    parser.add_argument("--api", action="store_true", help="builds api")
    parser.add_argument("--deploy", action="store_true", help="builds deploy")
    args = parser.parse_args()

    if len(sys.argv) == 1:
        build_web_app()
        build_api()
        # needs to be last to ensure the dependencies are built before the CDK deployment can build/run
        build_deploy()
    else:
        if args.web:
            build_web_app()
        if args.api:
            build_api()
        if args.deploy:
            build_deploy()


if __name__ == "__main__":
    main()
