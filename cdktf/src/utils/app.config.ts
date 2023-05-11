const { APP_NAME, APP_ENV, REGION } = process.env

export const appConfig = {
  appName: APP_NAME ?? "app",
  appENV: APP_ENV ?? "dev",
  region: REGION ?? "eu-central-1",
}
