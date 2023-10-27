# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
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
