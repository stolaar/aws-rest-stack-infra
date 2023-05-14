import { TEndpointConfig, TLambdaConfig } from "./lambda-config.schema"
import { Construct } from "constructs"
import * as aws from "@cdktf/provider-aws"

interface IApiConfig {
  restApi: aws.apiGatewayRestApi.ApiGatewayRestApi
  resource: aws.apiGatewayResource.ApiGatewayResource
  auth: aws.apiGatewayAuthorizer.ApiGatewayAuthorizer
}

interface IConfig {
  lambdaConfig: TLambdaConfig
  apiConfig: IApiConfig
  lambdaArn: string
}

interface IEndpointsConfig extends Omit<IConfig, "apiConfig"> {
  apiConfig: Omit<IConfig["apiConfig"], "resource">
}

interface IMethodConfig extends IConfig {
  endpoint: TEndpointConfig
}

const createResource = (
  scope: Construct,
  constructPrefix: string,
  endpoint: string,
  config: IApiConfig,
  parentId?: string,
) => {
  return new aws.apiGatewayResource.ApiGatewayResource(
    scope,
    `${constructPrefix}-resource`,
    {
      restApiId: config.restApi.id,
      parentId: parentId ?? config.restApi.rootResourceId,
      pathPart: endpoint,
    },
  )
}

const createApiMethod = (
  scope: Construct,
  constructPrefix: string,
  config: IMethodConfig,
) => {
  const {
    apiConfig: { restApi, resource, auth },
    lambdaArn,
    endpoint,
  } = config

  const idPrefix = constructPrefix + endpoint.path.replace(/\//g, "")

  const method = new aws.apiGatewayMethod.ApiGatewayMethod(
    scope,
    `${idPrefix}-method`,
    {
      restApiId: restApi.id,
      resourceId: resource.id,
      httpMethod: endpoint.method ?? "ANY",
      ...(endpoint.secure
        ? {
            authorization: "COGNITO_USER_POOLS",
            authorizerId: auth.id,
            authorizationScopes: ["JWT"],
          }
        : {
            authorization: "NONE",
          }),
    },
  )
  const methodResponse =
    new aws.apiGatewayMethodResponse.ApiGatewayMethodResponse(
      scope,
      `${idPrefix}-method-response`,
      {
        restApiId: restApi.id,
        resourceId: resource.id,
        httpMethod: method.httpMethod,
        statusCode: "200",
        responseModels: {
          "application/json": "Empty",
        },
      },
    )

  const integration = new aws.apiGatewayIntegration.ApiGatewayIntegration(
    scope,
    `${idPrefix}-api-integration`,
    {
      restApiId: restApi.id,
      type: "AWS_PROXY",
      uri: lambdaArn,
      resourceId: resource.id,
      httpMethod: method.httpMethod,
      integrationHttpMethod: "POST",
    },
  )

  new aws.apiGatewayIntegrationResponse.ApiGatewayIntegrationResponse(
    scope,
    `${idPrefix}-integration-response`,
    {
      restApiId: restApi.id,
      resourceId: resource.id,
      httpMethod: method.httpMethod,
      statusCode: methodResponse.statusCode,
      dependsOn: [integration],
      responseTemplates: {
        "application/json": "",
      },
    },
  )
  return { method, integration }
}

export const createEndpoints = (
  scope: Construct,
  constructPrefix: string,
  config: IEndpointsConfig,
) => {
  const { lambdaConfig } = config
  const parentResource = createResource(
    scope,
    constructPrefix,
    lambdaConfig.baseEndpoint.replace("/", ""),
    config.apiConfig as IApiConfig,
  )
  let endpoints: {
    method: aws.apiGatewayMethod.ApiGatewayMethod
    integration: aws.apiGatewayIntegration.ApiGatewayIntegration
  }[] = []
  if (lambdaConfig.endpoints) {
    endpoints = lambdaConfig.endpoints.map((endpoint) => {
      const resource = createResource(
        scope,
        `${endpoint.path.replace(/[-\/]/g, "")}${constructPrefix}`,
        endpoint.path.replace("/", ""),
        config.apiConfig as IApiConfig,
        parentResource.id,
      )
      return createApiMethod(scope, constructPrefix, {
        ...config,
        apiConfig: {
          ...config.apiConfig,
          resource,
        },
        endpoint,
      })
    })
  }
  const resource = createResource(
    scope,
    `proxy-${constructPrefix}`,
    `{proxy+}`,
    config.apiConfig as IApiConfig,
    parentResource.id,
  )
  const proxyMethod = createApiMethod(scope, `proxy-${constructPrefix}`, {
    ...config,
    apiConfig: {
      ...config.apiConfig,
      resource,
    },
    endpoint: {
      path: `{proxy+}`,
      method: "ANY",
      secure: true,
    },
  })

  return [...endpoints, proxyMethod]
}
