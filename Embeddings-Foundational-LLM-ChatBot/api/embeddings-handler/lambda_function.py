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
# --  Purpose:       Deploys the embeddings model
# --  Version:       0.1.0
# --  Disclaimer:    This code is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

import json
import os
from sagemaker.huggingface.model import HuggingFaceModel
from sagemaker import Session 
import uuid
from datetime import datetime

EMBEDDING_MODEL_BUCKET_NAME = os.environ["EMBEDDING_MODEL_BUCKET_NAME"]
SAGEMAKER_EXECUTION_ROLE = os.environ["SAGEMAKER_EXECUTION_ROLE"]
AWS_REGION = os.environ['AWS_REGION']

def lambda_handler(event, context):
    
    huggingface_model = HuggingFaceModel(
        model_data= "s3://" + EMBEDDING_MODEL_BUCKET_NAME + "/model.tar.gz",       
        role= SAGEMAKER_EXECUTION_ROLE,               
        transformers_version="4.12",  
        pytorch_version="1.9",        
        py_version='py38'
          
)

    huggingface_model.deploy(
        endpoint_name="e5-largev2",
        initial_instance_count=1,
        instance_type="ml.g5.4xlarge")
        
    return {
        'statusCode': 200,
        'body': json.dumps('Model deploy')
    }