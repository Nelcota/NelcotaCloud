import { stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { CliError } from '../cli/cli-error'

/** The folder `nelcota init` creates; the folder that holds it is the project root. */
export const PROJECT_FOLDER = 'nelcota'

/** Walks up from `start` to the nearest folder that holds `nelcota/`. */
export async function findProjectRoot(start: string): Promise<string | undefined> {
  const candidate = join(start, PROJECT_FOLDER)

  if (await isDirectory(candidate)) {
    return start
  }

  const parent = dirname(start)

  if (parent === start) {
    return undefined
  }

  return findProjectRoot(parent)
}

export async function requireProjectRoot(start: string): Promise<string> {
  const root = await findProjectRoot(start)

  if (root === undefined) {
    throw new CliError('Pasta nelcota/ não encontrada aqui nem acima. Rode nelcota init primeiro.')
  }

  return root
}

export async function isDirectory(path: string): Promise<boolean> {
  try {
    const entry = await stat(path)

    return entry.isDirectory()
  } catch {
    return false
  }
}

export async function isFile(path: string): Promise<boolean> {
  try {
    const entry = await stat(path)

    return entry.isFile()
  } catch {
    return false
  }
}
