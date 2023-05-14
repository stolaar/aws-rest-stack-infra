import { Construct } from "constructs"
import * as aws from "@cdktf/provider-aws"
import { appConfig } from "./utils"

export const createSecurityGroup = (scope: Construct, name: string) => {
  return new aws.securityGroup.SecurityGroup(scope, name, {
    name: `${appConfig.appName}-${appConfig.appENV}-${name}`,
    ingress: [
      {
        fromPort: 3306,
        toPort: 3306,
        protocol: "tcp",
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
) => {
  return new aws.dbInstance.DbInstance(scope, name, {
    engine: "postgres",
    instanceClass: "db.t3.micro",
    allocatedStorage: 20,
    username: `${name}-postgres-user`.replace(/-/g, ""),
    password: "postgres-pwd",
    dbName: `${name}-postgres-db`.replace(/-/g, ""),
    vpcSecurityGroupIds: vpcIds,
    skipFinalSnapshot: true,
    backupRetentionPeriod: 0,
    applyImmediately: true,
  })
}
