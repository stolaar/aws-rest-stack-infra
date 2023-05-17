import { Construct } from "constructs"
import * as aws from "@cdktf/provider-aws"
import { scopeName } from "../utils"
import * as random from "@cdktf/provider-random"

export const createSecurityGroup = (scope: Construct, name: string) => {
  return new aws.securityGroup.SecurityGroup(scope, name, {
    name: scopeName(name),
    ingress: [
      {
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    egress: [
      {
        fromPort: 0,
        toPort: 0,
        protocol: "-1",
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
  })
}
export const createDatabase = (
  scope: Construct,
  name: string,
  vpcIds: string[],
  dbName = "postgres",
) => {
  const secrets = new aws.secretsmanagerSecret.SecretsmanagerSecret(
    scope,
    scopeName(name, "db-secret"),
    {
      name: scopeName(name, "db-password"),
      recoveryWindowInDays: 0,
    },
  )

  const randomPassword = new random.password.Password(
    scope,
    scopeName(name, "random-password"),
    {
      length: 16,
    },
  )

  const secretVersion =
    new aws.secretsmanagerSecretVersion.SecretsmanagerSecretVersion(
      scope,
      scopeName(name, "secret-version"),
      {
        secretId: secrets.id,
        secretString: randomPassword.result,
      },
    )
  const dbInstance = new aws.dbInstance.DbInstance(scope, name, {
    engine: "postgres",
    instanceClass: "db.t3.micro",
    allocatedStorage: 20,
    username: "dbuser",
    password: secretVersion.secretString,
    dbName,
    vpcSecurityGroupIds: vpcIds,
    skipFinalSnapshot: true,
    publiclyAccessible: true,
    backupRetentionPeriod: 0,
    applyImmediately: true,
  })

  return `postgres://dbuser:${secretVersion.secretString}@${dbInstance.address}/${dbName}`
}
