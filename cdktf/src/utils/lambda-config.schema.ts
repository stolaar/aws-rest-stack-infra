import { z } from "zod"

export const lambdaConfigSchema = z.object({
  handler: z.string(),
  path: z.string(),
  runtime: z.string(),
  stageName: z.string(),
  version: z.string(),
  name: z.string(),
})

export type TLambdaConfig = z.infer<typeof lambdaConfigSchema>
