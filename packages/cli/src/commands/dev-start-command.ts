import { basename } from 'node:path'

import { CliError } from '../cli/cli-error'
import type { CommandContext, Output } from '../cli/command-context'
import type { ParsedCommand } from '../cli/parse-command-line'
import { localPathsOf } from '../config/local-paths'
import type { LocalProject } from '../config/local-project'
import { requireProjectRoot } from '../config/project-root'
import { isWebAddress } from '../config/web-address'
import { apiImageOf } from '../dev/compose-template'
import { apiUrlOf, mailpitUrlOf } from '../dev/dev-environment'
import type { DevEnvironment } from '../dev/dev-environment'
import { prepareDevFolder } from '../dev/dev-folder'
import { ensureDevProject } from '../dev/dev-project'
import { checkSlug, slugFromFolderName } from '../dev/dev-slug'
import { checkDocker, composeArguments, runCompose } from '../dev/docker-compose'
import { waitForHealth } from '../dev/wait-for-health'
import { ensureLocalStateIgnored } from '../project/gitignore'

const HEALTH_TIMEOUT_MS = 60_000
const DEFAULT_SITE_URL = 'http://localhost:5173'
const MAX_PROJECT_NAME_LENGTH = 100

/** Starts the local stack, waits for the API and creates its project the first time. */
export async function runDevStart(
  command: ParsedCommand,
  context: CommandContext,
): Promise<number> {
  const { options } = command
  const root = await requireProjectRoot(context.cwd)
  const folderName = basename(root)
  const slug = checkSlug(options.slug ?? slugFromFolderName(folderName))
  const siteUrl = siteUrlOf(options.siteUrl)
  const paths = localPathsOf(root)
  await checkDocker(context.docker, root)
  await ensureLocalStateIgnored(root)
  const environment = await prepareDevFolder(paths, root, apiImageOf(context.environment))
  await runCompose(context.docker, paths.devFolder, composeArguments(environment, ['up', '-d']))
  const apiUrl = apiUrlOf(environment)
  await requireHealthyApi(apiUrl, context)
  const name = projectNameOf(folderName, slug)
  const { adminToken } = environment
  const project = await ensureDevProject(
    paths,
    { apiUrl, adminToken, slug, name, siteUrl },
    context,
  )
  printSummary(project, environment, context.output)

  return 0
}

function siteUrlOf(option: string | undefined): string {
  const siteUrl = option?.trim() ?? DEFAULT_SITE_URL

  if (isWebAddress(siteUrl) === false) {
    throw new CliError('--site-url precisa ser um endereço http(s), como http://localhost:5173.')
  }

  return siteUrl
}

/** The folder's name as the project's display name (one line, at most 100 characters). */
function projectNameOf(folderName: string, slug: string): string {
  const name = folderName.replace(/\s+/g, ' ').trim().slice(0, MAX_PROJECT_NAME_LENGTH)

  return name || slug
}

async function requireHealthyApi(apiUrl: string, context: CommandContext): Promise<void> {
  context.output.note('Aguardando a API...')

  if (await waitForHealth(apiUrl, context, HEALTH_TIMEOUT_MS)) {
    return
  }

  throw new CliError(
    'A API não respondeu em 60 s. Veja os logs com: cd .nelcota/dev && docker compose logs api',
  )
}

function printSummary(project: LocalProject, environment: DevEnvironment, output: Output): void {
  output.print(`API:                ${project.api_url}`)
  output.print(`Chave publicável:   ${project.publishable_key}`)
  output.print(`Mailpit (e-mails):  ${mailpitUrlOf(environment)}`)
  output.print(`Postgres:           localhost:${environment.postgresPort}`)
  output.print('')
  output.print('Use --local nos comandos para falar com este projeto, por exemplo:')
  output.print('  nelcota migrations push --local')
}
