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
# --  Purpose:       Image Generation
# --  Version:       0.1.0
# --  Disclaimer:    This code is provided "as is" in accordance with the repository license
# --  History
# --  When        Version     Who         What
# --  -----------------------------------------------------------------
# --  04/11/2023  0.1.0       jtanruan    Initial
# --  -----------------------------------------------------------------
# --

import boto3
import base64 
import time
import json
from PIL import Image
from io import BytesIO
from config import S3_INPUT_ASSETS_BUCKET_NAME, S3_OUTPUT_ASSETS_BUCKET_NAME
from resources import bedrock
from utils import invoke_model
import os


def strength_map(strength):
    strength_dict = {
        "Low": 0.3,
        "Medium": 0.6,
        "High": 0.9
    }
    return strength_dict.get(strength, None)


def image_generation(location, style, model_id, source_image, strength):
     
    image_prompt = f"Modify the background location to {location}, in the style of realistic and hyper-detailed renderings, best quality, professional photography, intricate design and details, dramatic lighting, hyperrealism, photorealistic, cinematic, 8k, detailed face, 8K raw photo, ultra high res"
        
    s3 = boto3.client('s3')
    response = s3.get_object(Bucket=S3_INPUT_ASSETS_BUCKET_NAME, Key="public/reference-images/"+source_image)
    image_data = response['Body'].read()

    # Now use this image data with PIL's Image.open method
    with Image.open(BytesIO(image_data)) as init_image:
        init_image = init_image.resize((768, 448))
        buffer = BytesIO()
        init_image.save(buffer, format="PNG")
        init_image_bytestring = base64.b64encode(buffer.getvalue()).decode()

    json_obj = {
            "height": 448,
            "width": 768,
            "text_prompts": [
                {"text": image_prompt, "weight": 1},
                {"text": "Ugly, Disfigured, Deformed, Low quality, Pixelated, Blurry, Grains, Text, Watermark, Signature, Out of frame, Disproportioned, Bad proportions, Gross proportions, Bad anatomy, Duplicate, Cropped, Extra hands, Extra arms, Extra legs, Extra fingers, Extra limbs, Long neck, Mutation, Mutilated, Mutated hands, Poorly drawn face, Poorly drawn hands, Missing hands, Missing arms, Missing legs, Missing fingers, Low resolution, Morbid, close-up, creepy, deformed structures, grainy, jpeg artifacts low contrast,low quality, lowres, macro, multiple angles, multiple views, overexposed, oversaturated, plain background,  scary, solid background, surreal, underexposed, unreal architecture, unreal sky, weird colors", "weight": -1},
            ],
            "steps": 150,
            "init_image_mode": "IMAGE_STRENGTH",
            "image_strength": strength_map(strength),
            "init_image": init_image_bytestring,
            "style_preset": style.lower(),
        }
    
    body = json.dumps(json_obj)

    modelId = model_id
    accept = 'application/json'
    contentType = 'application/json'

    response = invoke_model(body, modelId)
    response_body = json.loads(response.get('body').read())
    
    image_base64 = response_body['artifacts'][0]['base64']
    seed_number = response_body['artifacts'][0]['seed']
    base_name, ext = os.path.splitext(source_image)
    timestamp = int(time.time())
    
    image_data = base64.b64decode(image_base64)
    image_obj = Image.open(BytesIO(image_data))
    
    buffered = BytesIO()
    
    if ext == '.jpg' or ext == '.jpeg':
        image_obj.save(buffered, format="JPEG", quality=95)  # Save with higher quality
    else: 
        image_obj.save(buffered, format=ext[1:].upper())
    
    buffered.seek(0)
    base_name, ext = os.path.splitext(source_image)
    image_filename = f"{base_name}-{seed_number}-{timestamp}{ext}"
    
    s3.put_object(Bucket=S3_OUTPUT_ASSETS_BUCKET_NAME, Key=image_filename, Body=buffered.getvalue(), ContentType='image/png')
    s3_url = f"https://{S3_OUTPUT_ASSETS_BUCKET_NAME}.s3.amazonaws.com/{image_filename}"

    url = s3.generate_presigned_url('get_object',
        Params={'Bucket': S3_OUTPUT_ASSETS_BUCKET_NAME, 'Key': image_filename}, ExpiresIn=3600)    
    
    return url