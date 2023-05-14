import { appConfig } from "./app.config"

export const scopeName = (...ids: string[]) =>
  `${appConfig.appName}-${appConfig.appENV}-${ids.join("-")}`

export const removeChar = (str: string, char = "-") =>
  str.replace(new RegExp(char, "g"), "")
