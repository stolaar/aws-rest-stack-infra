import { z } from "zod"

const endpointConfigSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE", "ANY"]),
  path: z.string(),
  secure: z.boolean().optional(),
})

export const lambdaConfigSchema = z.object({
  handler: z.string(),
  path: z.string(),
  runtime: z.string(),
  stageName: z.string(),
  version: z.string(),
  name: z.string(),
  baseEndpoint: z.string(),
  useDatabase: z.boolean().optional(),
  endpoints: z.array(endpointConfigSchema).optional(),
})

export type TLambdaConfig = z.infer<typeof lambdaConfigSchema>
export type TEndpointConfig = z.infer<typeof endpointConfigSchema>
