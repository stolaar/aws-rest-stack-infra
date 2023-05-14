import { app } from "./src/app"
import { RestApiStack } from "./src/api/rest-api-stack"

import { getFunctions } from "../functions"
import { lambdaConfigSchema } from "./src/utils"

const bootstrap = async () => {
  const lambdaConfigs = await getFunctions()

  new RestApiStack(
    app,
    "rest",
    lambdaConfigs.filter(
      (config) => lambdaConfigSchema.safeParse(config).success,
    ),
  )

  app.synth()
}

bootstrap()
