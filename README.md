### Description

This project utilizes [cdktf](https://developer.hashicorp.com/terraform/cdktf) to deploy lambda functions to AWS. 
It also creates an API Gateway, Cognito User Pool, and Postgres RDS instance based on the functions' configuration.

### Get started

1. Install [Node.js](https://nodejs.org/en/) (v10.16.0 or higher).
2. Install dependencies: `npm install`.

### Development

1. Add your lambda functions to the `functions` folder.

- Each function should be in its own folder.
- Each function should provide `cdktf.config.json` file with the following structure:
```json
{
  "handler": "handler.lambda_handler",
  "stageName": "stage-name",
  "version": "v0.1",
  "name": "hello-world-python",
  "runtime": "python3.10",
  "useDatabase": true,
  "baseEndpoint": "/users",
  "endpoints": [
    {
      "method": "GET",
      "path": "/{id}",
      "secure": true
    },
    {
      "method": "POST",
      "path": "/"
    }
  ]
}
```

> - `endpoints` is optional. If not provided, the api gateway will expose `${baseEndpoint}/{proxy+}` endpoint.
>
> 
> - `useDatabase` is optional. If not provided, the function will not have access to the database.

Deploy your functions: `cdktf deploy stack-name`.


#### Todo

- [ ] Add support for multiple functions in one folder.
- [X] Add support for data sources.
- [ ] Add support for multiple stacks.
