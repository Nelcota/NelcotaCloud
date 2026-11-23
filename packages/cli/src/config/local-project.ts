import { readFile, writeFile } from 'node:fs/promises'

import { asRecord, stringField } from '../api/json-fields'
import { CliError } from '../cli/cli-error'
import { SECRET_KEY_PREFIX, checkedApiUrl } from './api-target'
import type { ApiTarget } from './api-target'

/** The project `nelcota dev start` created on the local stack, kept in `project.json`. */
export type LocalProject = {
  tenant_id: string
  slug: string
  publishable_key: string
  secret_key: string
  api_url: string
}

export async function readLocalProject(path: string): Promise<LocalProject> {
  const text = await readFile(path, 'utf8').catch(() => {
    throw new CliError('Projeto local não encontrado. Rode nelcota dev start primeiro.')
  })

  return parseLocalProject(text)
}

/** Owner-only permissions where the platform has them: the file holds a secret key. */
export async function writeLocalProject(path: string, project: LocalProject): Promise<void> {
  await writeFile(path, `${JSON.stringify(project, null, 2)}\n`, { mode: 0o600 })
}

export function parseLocalProject(text: string): LocalProject {
  const record = asRecord(parseJson(text), 'project.json')
  const project = {
    tenant_id: stringField(record, 'tenant_id'),
    slug: stringField(record, 'slug'),
    publishable_key: stringField(record, 'publishable_key'),
    secret_key: stringField(record, 'secret_key'),
    api_url: checkedApiUrl(stringField(record, 'api_url')),
  }

  if (project.secret_key.startsWith(SECRET_KEY_PREFIX) === false) {
    throw new CliError(
      'project.json não tem uma chave secreta válida. Rode nelcota dev stop --reset.',
    )
  }

  return project
}

export function targetOfLocalProject(project: LocalProject): ApiTarget {
  return { apiUrl: project.api_url, secretKey: project.secret_key }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new CliError('project.json está corrompido. Rode nelcota dev stop --reset.')
  }
}
