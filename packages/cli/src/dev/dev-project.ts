import { sendJson } from '../api/http-json'
import { asRecord, stringField } from '../api/json-fields'
import type { CommandContext } from '../cli/command-context'
import type { LocalPaths } from '../config/local-paths'
import { readLocalProject, writeLocalProject } from '../config/local-project'
import type { LocalProject } from '../config/local-project'
import { isFile } from '../config/project-root'

/** Creating a project provisions its database and runs its migrations: give it time. */
const CREATE_TIMEOUT_MS = 120_000

export type DevProjectRequest = {
  apiUrl: string
  adminToken: string
  slug: string
  name: string
  siteUrl: string
}

/**
 * The project of the local stack: created once with the admin token, then read back. A new
 * API port (edited in `.env`) is written into `project.json` so `--local` follows it.
 */
export async function ensureDevProject(
  paths: LocalPaths,
  request: DevProjectRequest,
  context: CommandContext,
): Promise<LocalProject> {
  if (await isFile(paths.projectFile)) {
    return refreshApiUrl(paths.projectFile, request.apiUrl)
  }

  const project = await createDevProject(request, context)
  await writeLocalProject(paths.projectFile, project)

  return project
}

async function refreshApiUrl(projectFile: string, apiUrl: string): Promise<LocalProject> {
  const project = await readLocalProject(projectFile)

  if (project.api_url === apiUrl) {
    return project
  }

  const moved = { ...project, api_url: apiUrl }
  await writeLocalProject(projectFile, moved)

  return moved
}

async function createDevProject(
  request: DevProjectRequest,
  context: CommandContext,
): Promise<LocalProject> {
  const { apiUrl, adminToken, slug, name, siteUrl } = request
  const payload = await sendJson(context.fetch, {
    method: 'POST',
    url: `${apiUrl}/admin/v1/tenants`,
    headers: { 'x-admin-token': adminToken },
    body: { slug, name, site_url: siteUrl },
    timeoutMs: CREATE_TIMEOUT_MS,
  })
  const created = asRecord(payload, 'tenant')

  return {
    tenant_id: stringField(created, 'tenant_id'),
    slug: stringField(created, 'slug'),
    publishable_key: stringField(created, 'publishable_key'),
    secret_key: stringField(created, 'secret_key'),
    api_url: apiUrl,
  }
}
