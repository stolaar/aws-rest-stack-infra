import { Construct } from "constructs"
import * as aws from "@cdktf/provider-aws"

export const createCognitoUserPool = (scope: Construct, name: string) => {
  return new aws.cognitoUserPool.CognitoUserPool(scope, name, {
    name,
    aliasAttributes: ["email"],
    mfaConfiguration: "OFF",
    accountRecoverySetting: {
      recoveryMechanism: [
        {
          name: "verified_email",
          priority: 1,
        },
      ],
    },
  })
}

export const createCognitoUserPoolClient = (
  scope: Construct,
  name: string,
  userPoolId: string,
) => {
  return new aws.cognitoUserPoolClient.CognitoUserPoolClient(scope, name, {
    userPoolId,
    name,
    explicitAuthFlows: [
      "ALLOW_USER_PASSWORD_AUTH",
      "ALLOW_USER_SRP_AUTH",
      "ALLOW_REFRESH_TOKEN_AUTH",
    ],
  })
}
