# API feature

The `example-*` api's in this folder are just examples of Lambda APIs.  Only the `example` Lambda is actually used in the template to demonstrate the full loop.  The APIs should be removed after you start adding your own APIs or choose another server technology.  The custom-build and custom-container-build should only be used if LambdaPython and NodePython constructs won't work for your use case. 

## CloudFront Caching

Requests proxied through CloudFront with an authorization header require that caching vary by the authorization header to ensure cached data isn't delivered to the wrong requester.  Therefore, APIs must tell CloudFront not to cache the response by including the `Cache-Control: no-cache, no-store` header.  See the example below.

```
def build_response(http_code, body):
    return {
        "headers": {
            "Cache-Control": "no-cache, no-store", # tell cloudfront and api gateway not to cache the response
            "Content-Type": "application/json",
        },
        "statusCode": http_code,
        "body": body,
    }
```