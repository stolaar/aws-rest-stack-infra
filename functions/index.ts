import * as fs from "fs"
import * as path from "path"

export const getFunctions = async () => {
  return Promise.all(
    fs
      .readdirSync(__dirname, { withFileTypes: true })
      .filter((value) => value.isDirectory())
      .map(async (dirent) => {
        try {
          const config = await require(`./${dirent.name}/cdktf.config.json`)
          return {
            ...config,
            path: path.resolve(__dirname, dirent.name),
          }
        } catch (err) {
          return {}
        }
      }),
  )
}
