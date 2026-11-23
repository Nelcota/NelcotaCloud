import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename } from 'node:path'

import { CliError } from '../cli/cli-error'
import type { LocalPaths } from '../config/local-paths'
import { isFile } from '../config/project-root'
import { renderComposeFile } from './compose-template'
import { parseEnvFile } from './dev-env-file'
import { composeProjectNameOf, generateDevEnvironment, renderEnvFile } from './dev-environment'
import type { DevEnvironment } from './dev-environment'
import { slugFromFolderName } from './dev-slug'

/**
 * Writes the compose file and, the first time only, the `.env` with fresh secrets: later
 * starts keep them, or the existing Postgres volume would refuse the new password.
 */
export async function prepareDevFolder(
  paths: LocalPaths,
  root: string,
  apiImage: string,
): Promise<DevEnvironment> {
  await mkdir(paths.devFolder, { recursive: true })
  const environment = await readOrCreateEnvironment(paths.envFile, root)
  await writeFile(paths.composeFile, renderComposeFile(apiImage))

  return environment
}

async function readOrCreateEnvironment(envFile: string, root: string): Promise<DevEnvironment> {
  if (await isFile(envFile)) {
    return parseEnvFile(await readFile(envFile, 'utf8'))
  }

  const projectName = composeProjectNameOf(slugFromFolderName(basename(root)))
  const environment = generateDevEnvironment(projectName, randomHex)
  await writeFile(envFile, renderEnvFile(environment), { mode: 0o600 })

  return environment
}

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString('hex')
}

/** The stack `dev stop` and `dev status` act on; `undefined` before the first start. */
export async function readExistingEnvironment(
  paths: LocalPaths,
): Promise<DevEnvironment | undefined> {
  if ((await isFile(paths.composeFile)) === false || (await isFile(paths.envFile)) === false) {
    return undefined
  }

  const text = await readFile(paths.envFile, 'utf8').catch(() => {
    throw new CliError('Não foi possível ler .nelcota/dev/.env.')
  })

  return parseEnvFile(text)
}
