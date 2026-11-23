import { join } from 'node:path'

import { PROJECT_FOLDER } from './project-root'

/** Git-ignored folder with machine-local state (the dev stack, its secrets, its project). */
export const LOCAL_STATE_FOLDER = '.nelcota'

/** Where each file of a project lives, from its root. */
export type LocalPaths = {
  migrations: string
  devFolder: string
  composeFile: string
  envFile: string
  projectFile: string
}

export function localPathsOf(root: string): LocalPaths {
  const devFolder = join(root, LOCAL_STATE_FOLDER, 'dev')

  return {
    migrations: join(root, PROJECT_FOLDER, 'migrations'),
    devFolder,
    composeFile: join(devFolder, 'docker-compose.yml'),
    envFile: join(devFolder, '.env'),
    projectFile: join(devFolder, 'project.json'),
  }
}
