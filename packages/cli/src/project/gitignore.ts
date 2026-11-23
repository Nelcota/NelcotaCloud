import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { isDirectory, isFile } from '../config/project-root'

const GITIGNORE = '.gitignore'
export const IGNORED_ENTRY = '.nelcota/'
const EQUIVALENT_ENTRIES = new Set(['.nelcota', '.nelcota/', '/.nelcota', '/.nelcota/'])

export type IgnoreOutcome = { path: string; status: 'added' | 'present' }

/** `content` plus the `.nelcota/` line, or `undefined` when it already ignores the folder. */
export function withIgnoredEntry(content: string): string | undefined {
  const lines = content.split(/\r?\n/).map((line) => line.trim())

  if (lines.some((line) => EQUIVALENT_ENTRIES.has(line))) {
    return undefined
  }

  if (content === '' || content.endsWith('\n')) {
    return `${content}${IGNORED_ENTRY}\n`
  }

  return `${content}\n${IGNORED_ENTRY}\n`
}

/**
 * The nearest `.gitignore` from `root` up to the repository's top folder (the one with `.git`);
 * without one, a new file in `root`.
 */
export async function nearestGitignore(root: string): Promise<string> {
  const found = await findUpward(root)

  return found ?? join(root, GITIGNORE)
}

async function findUpward(folder: string): Promise<string | undefined> {
  const candidate = join(folder, GITIGNORE)

  if (await isFile(candidate)) {
    return candidate
  }

  const parent = dirname(folder)

  if (parent === folder || (await isRepositoryTop(folder))) {
    return undefined
  }

  return findUpward(parent)
}

async function isRepositoryTop(folder: string): Promise<boolean> {
  const marker = join(folder, '.git')

  return (await isDirectory(marker)) || isFile(marker)
}

/** Keeps the machine-local secrets in `.nelcota/` out of git. */
export async function ensureLocalStateIgnored(root: string): Promise<IgnoreOutcome> {
  const path = await nearestGitignore(root)
  const content = await readFile(path, 'utf8').catch(() => '')
  const updated = withIgnoredEntry(content)

  if (updated === undefined) {
    return { path, status: 'present' }
  }

  await writeFile(path, updated)

  return { path, status: 'added' }
}
