# React SPA Web App

## Developer Setup

1. Add example.com to your hosts file.  This is needed to support CORS restrictions for authenticated requests during development.

On mac/linux, edit /etc/hosts and add the following line:

```
127.0.0.1       example.com
```

2. Set the api gateway url for the shared development environment

After deployment of the shared development environment, edit the `.env.development` file and update the `REACT_APP_API_URL` environment variable to the ApiGatewayUrl.  This only needs to be done once.  

3. (Optional) Set the api gateway url for individual environments

Create an .env.development.local file and set the `REACT_APP_API_URL` to the ApiGatewayUrl of your own environment.
