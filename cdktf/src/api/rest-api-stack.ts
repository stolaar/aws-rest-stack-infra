import * as random from "@cdktf/provider-random"
import * as aws from "@cdktf/provider-aws"
import { Construct } from "constructs"
import { AssetType, TerraformAsset, TerraformStack } from "cdktf"
import * as path from "path"

import { appConfig, TLambdaConfig, scopeName } from "../utils"
import {
  createDatabase,
  createSecurityGroup,
} from "../database/create-database"
import {
  createCognitoUserPool,
  createCognitoUserPoolClient,
} from "../cognito/create-cognito"
import { createEndpoints } from "./create-endpoints"

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

  constructor(scope: Construct, name: string, configs: TLambdaConfig[]) {
    super(scope, name)

    new aws.provider.AwsProvider(this, "aws", {
      region: appConfig.region,
    })

    const securityGroup = createSecurityGroup(this, "security-group")
    const cognito = createCognitoUserPool(this, "cognito")
    createCognitoUserPoolClient(this, "cognito-client", cognito.id)

    new random.provider.RandomProvider(this, "random")

    const restApi = new aws.apiGatewayRestApi.ApiGatewayRestApi(
      this,
      "restApi",
      {
        name: scopeName("rest"),
      },
    )

    const auth = new aws.apiGatewayAuthorizer.ApiGatewayAuthorizer(
      this,
      "auth",
      {
        restApiId: restApi.id,
        type: "COGNITO_USER_POOLS",
        name: "cognito-authorizer",
        providerArns: [cognito.arn],
      },
    )

    const lambdas = configs.map((config) => {
      const lambdaName = config.name

      const randName = new random.pet.Pet(this, `rand-name-${lambdaName}`)
      let dbUrl = null
      // TODO: Find a way to create a database under the same cluster
      if (config.useDatabase) {
        dbUrl = createDatabase(
          this,
          scopeName(lambdaName, "database-instance"),
          [securityGroup.id],
          config.dbName,
        )
      }
      const asset = new TerraformAsset(
        this,
        scopeName(lambdaName, "lambda-asset"),
        {
          path: path.resolve(__dirname, config.path),
          type: AssetType.ARCHIVE,
        },
      )

      const bucket = new aws.s3Bucket.S3Bucket(
        this,
        scopeName(lambdaName, "bucket"),
        {
          bucketPrefix: `${appConfig.appName}-${appConfig.appENV}-${lambdaName}`,
        },
      )

      const lambdaArchive = new aws.s3Object.S3Object(
        this,
        scopeName(lambdaName, "lambda-archive"),
        {
          bucket: bucket.bucket,
          key: `${config.version}/${asset.fileName}`,
          source: asset.path,
          sourceHash: asset.assetHash,
        },
      )

      const role = new aws.iamRole.IamRole(
        this,
        scopeName(lambdaName, "lambda-exec"),
        {
          name: `lambda-role-${appConfig.appENV}-${lambdaName}-${randName.id}`,
          assumeRolePolicy: JSON.stringify(lambdaRolePolicy),
        },
      )

      const lambdaFunc = new aws.lambdaFunction.LambdaFunction(
        this,
        scopeName(lambdaName, "lambda"),
        {
          functionName: `${appConfig.appName}-${appConfig.appENV}-function-${lambdaName}-${randName.id}`,
          s3Bucket: bucket.bucket,
          s3Key: lambdaArchive.key,
          handler: config.handler,
          runtime: config.runtime,
          role: role.arn,
          sourceCodeHash: asset.assetHash,
          environment: {
            variables: {
              dbUrl: dbUrl ?? "",
            },
          },
        },
      )

      new aws.iamRolePolicyAttachment.IamRolePolicyAttachment(
        this,
        scopeName(lambdaName, "lambda-managed-policy"),
        {
          policyArn:
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
          role: role.name,
        },
      )

      new aws.lambdaPermission.LambdaPermission(
        this,
        scopeName(lambdaName, "apigw-lambda"),
        {
          functionName: lambdaFunc.functionName,
          action: "lambda:InvokeFunction",
          principal: "apigateway.amazonaws.com",
          sourceArn: `${restApi.executionArn}/*`,
        },
      )

      return createEndpoints(this, scopeName(lambdaName), {
        lambdaConfig: config,
        lambdaArn: lambdaFunc.invokeArn,
        apiConfig: {
          restApi,
          auth,
        },
      })
    })

    const methodsAndIntegrations = lambdas.flatMap((lambda) =>
      lambda.reduce((acc, l) => {
        acc.push(l.method, l.integration)
        return acc
      }, [] as (aws.apiGatewayMethod.ApiGatewayMethod | aws.apiGatewayIntegration.ApiGatewayIntegration)[]),
    )

    const apiDeployment = new aws.apiGatewayDeployment.ApiGatewayDeployment(
      this,
      "apiDeployment",
      {
        restApiId: restApi.id,
        dependsOn: methodsAndIntegrations,
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
