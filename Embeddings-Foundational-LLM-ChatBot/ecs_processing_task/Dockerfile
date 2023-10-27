# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

FROM python:3.10-slim
WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Optionally, to run the container as a non-root user:
# RUN addgroup --system app && adduser --system --group app
# USER app

ENTRYPOINT ["python"]
CMD ["lambda_function.py"]
