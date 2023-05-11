import * as random from "@cdktf/provider-random"
import * as aws from "@cdktf/provider-aws"
import { Construct } from "constructs"
import { AssetType, TerraformStack, TerraformAsset } from "cdktf"
import * as path from "path"

import { ILambdaFunctionConfig } from "./types"
import { appConfig } from "./utils"

const lambdaRolePolicy = {
  Version: "2012-10-17",
  Statement: [
    {
      Action: "sts:AssumeRole",
      Principal: {
        Service: "lambda.amazonaws.com",
      },
      Effect: "Allow",
      Sid: "",
    },
  ],
}

export class RestApiStack extends TerraformStack {
  public invocationURL: string

  constructor(
    scope: Construct,
    name: string,
    configs: ILambdaFunctionConfig[],
  ) {
    super(scope, name)

    new aws.provider.AwsProvider(this, "aws", {
      region: appConfig.region,
    })

    new random.provider.RandomProvider(this, "random")

    const restApi = new aws.apiGatewayRestApi.ApiGatewayRestApi(
      this,
      "restApi",
      {
        name: `${appConfig.appName}-${appConfig.appENV}-rest`,
      },
    )

    const lambdas = configs.map((config) => {
      const lambdaName = config.name

      const randName = new random.pet.Pet(this, `rand-name-${lambdaName}`)

      const asset = new TerraformAsset(this, `lambda-asset-${lambdaName}`, {
        path: path.resolve(__dirname, config.path),
        type: AssetType.ARCHIVE,
      })

      const bucket = new aws.s3Bucket.S3Bucket(this, `bucket-${lambdaName}`, {
        bucketPrefix: `${appConfig.appName}-${appConfig.appENV}-${lambdaName}`,
      })

      const lambdaArchive = new aws.s3Object.S3Object(
        this,
        `lambda-archive-${lambdaName}`,
        {
          bucket: bucket.bucket,
          key: `${config.version}/${asset.fileName}`,
          source: asset.path,
          sourceHash: asset.assetHash,
        },
      )

      const role = new aws.iamRole.IamRole(this, `lambda-exec-${lambdaName}`, {
        name: `lambda-role-${appConfig.appENV}-${lambdaName}-${randName.id}`,
        assumeRolePolicy: JSON.stringify(lambdaRolePolicy),
      })

      const lambdaFunc = new aws.lambdaFunction.LambdaFunction(
        this,
        `lambda-${lambdaName}`,
        {
          functionName: `${appConfig.appName}-${appConfig.appENV}-function-${lambdaName}-${randName.id}`,
          s3Bucket: bucket.bucket,
          s3Key: lambdaArchive.key,
          handler: config.handler,
          runtime: config.runtime,
          role: role.arn,
          sourceCodeHash: asset.assetHash,
        },
      )

      new aws.iamRolePolicyAttachment.IamRolePolicyAttachment(
        this,
        `lambda-managed-policy-${lambdaName}`,
        {
          policyArn:
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
          role: role.name,
        },
      )

      const resource = new aws.apiGatewayResource.ApiGatewayResource(
        this,
        config.stageName,
        {
          restApiId: restApi.id,
          parentId: restApi.rootResourceId,
          pathPart: lambdaName,
        },
      )

      const method = new aws.apiGatewayMethod.ApiGatewayMethod(
        this,
        `${lambdaName}-method`,
        {
          restApiId: restApi.id,
          resourceId: resource.id,
          httpMethod: "ANY",
          authorization: "NONE",
          apiKeyRequired: false,
        },
      )

      const methodResponse =
        new aws.apiGatewayMethodResponse.ApiGatewayMethodResponse(
          this,
          `${lambdaName}-method-response`,
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
        this,
        `${lambdaName}-api-integration`,
        {
          restApiId: restApi.id,
          type: "AWS_PROXY",
          uri: lambdaFunc.invokeArn,
          resourceId: resource.id,
          httpMethod: method.httpMethod,
          integrationHttpMethod: "POST",
        },
      )

      new aws.apiGatewayIntegrationResponse.ApiGatewayIntegrationResponse(
        this,
        `${lambdaName}-integration-response`,
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

      new aws.lambdaPermission.LambdaPermission(
        this,
        `apigw-lambda-${lambdaName}`,
        {
          functionName: lambdaFunc.functionName,
          action: "lambda:InvokeFunction",
          principal: "apigateway.amazonaws.com",
          sourceArn: `${restApi.executionArn}/*`,
        },
      )

      return { method, integration }
    })

    const apiDeployment = new aws.apiGatewayDeployment.ApiGatewayDeployment(
      this,
      "apiDeployment",
      {
        restApiId: restApi.id,
        dependsOn: lambdas.flatMap((lambda) => [
          lambda.method,
          lambda.integration,
        ]),
      },
    )

    const stage = new aws.apiGatewayStage.ApiGatewayStage(this, "api", {
      restApiId: restApi.id,
      deploymentId: apiDeployment.id,
      stageName: "api",
    })

    this.invocationURL = stage.invokeUrl
  }
}
