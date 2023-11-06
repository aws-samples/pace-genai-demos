#!/bin/bash
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
# --  Purpose:       Creates Embeddings Model
# --  Version:       0.1.0
# --  Disclaimer:    This script is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

set -e

# Create a directory for the code
mkdir -p code

# Create the inference.py file
cat <<EOF > code/inference.py
from transformers import AutoTokenizer, AutoModel
import torch
import numpy as np
import torch.nn.functional as F

# Helper: Mean Pooling - Take attention mask into account for correct averaging
def mean_pooling(model_output, attention_mask):
    token_embeddings = model_output[0] #First element of model_output contains all token embeddings
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)


def model_fn(model_dir):
  # Load model from HuggingFace Hub
  tokenizer = AutoTokenizer.from_pretrained(model_dir)
  model = AutoModel.from_pretrained(model_dir)
  return model, tokenizer

def predict_fn(data, model_and_tokenizer):
    # destruct model and tokenizer
    model, tokenizer = model_and_tokenizer

  # Tokenize sentences
    sentences = data.pop("inputs", data)
    encoded_input = tokenizer(sentences, padding=True, truncation=True, return_tensors='pt')

    # Compute token embeddings
    with torch.no_grad():
        model_output = model(**encoded_input)

    # Perform pooling
    sentence_embeddings = mean_pooling(model_output, encoded_input['attention_mask'])

    # Normalize embeddings
    sentence_embeddings = F.normalize(sentence_embeddings, p=2, dim=1)

    # return dictonary, which will be json serializable
    return {"vectors": sentence_embeddings.tolist()}
EOF

# Clone the repository
git lfs install
git clone https://huggingface.co/intfloat/e5-large-v2


# Copy the code
model_id="e5-large-v2"
cp -r code/ $model_id/code/

# Create the tarball
cd $model_id
tar zcvf model.tar.gz *

echo "---- Files after git clone ----"
ls -alh

# Move the model.tar to a known location
mkdir -p /app/embedding_model
mv model.tar.gz /app/embedding_model/
ls -alh /app/embedding_model/

# Verify movement of tarball
echo "---- Files in embedding_model directory ----"
ls -alh ../embedding_model

echo "Script completed successfully."

echo "Keeping the container running..."
tail -f /dev/null


