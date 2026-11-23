import { CliError } from '../cli/cli-error'
import type { DevEnvironment } from './dev-environment'
import type { DockerRunner } from './docker-runner'

const COMPOSE_FILE_NAME = 'docker-compose.yml'
const ENV_FILE_NAME = '.env'

/** Fails early with a clear message when Docker or its compose plugin is missing. */
export async function checkDocker(docker: DockerRunner, cwd: string): Promise<void> {
  const exitCode = await docker({ args: ['compose', 'version'], cwd, quiet: true })

  if (exitCode !== 0) {
    throw new CliError('O comando docker compose não está disponível. Instale o plugin compose.')
  }
}

/**
 * `docker compose` for the stack in `devFolder`, with its project name and `.env` named
 * explicitly so a `COMPOSE_PROJECT_NAME` in the shell never points it at another stack.
 */
export function composeArguments(
  environment: DevEnvironment,
  command: readonly string[],
): string[] {
  return [
    'compose',
    '--project-name',
    environment.projectName,
    '--env-file',
    ENV_FILE_NAME,
    '--file',
    COMPOSE_FILE_NAME,
    ...command,
  ]
}

export async function runCompose(
  docker: DockerRunner,
  devFolder: string,
  args: readonly string[],
): Promise<void> {
  const exitCode = await docker({ args, cwd: devFolder })

  if (exitCode !== 0) {
    throw new CliError(`docker ${args.join(' ')} terminou com o código ${exitCode}.`)
  }
}
