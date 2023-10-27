#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
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
git clone https://huggingface.co/intfloat/e5-large


# Copy the code
model_id="e5-large"
cp -r code/ $model_id/code/

# Create the tarball
cd $model_id
tar zcvf model.tar.gz *


echo "---- Files after git clone ----"
ls -alh

# Move the model.tar.gz to a known location
mkdir -p /app/embedding_model
mv model.tar.gz /app/embedding_model/
ls -alh /app/embedding_model/

# Verify movement of tarball
echo "---- Files in embedding_model directory ----"
ls -alh ../embedding_model

echo "Script completed successfully."

echo "Keeping the container running..."
tail -f /dev/null
