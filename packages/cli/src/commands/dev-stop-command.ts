import { rm } from 'node:fs/promises'

import type { CommandContext } from '../cli/command-context'
import type { ParsedCommand } from '../cli/parse-command-line'
import { localPathsOf } from '../config/local-paths'
import { requireProjectRoot } from '../config/project-root'
import { readExistingEnvironment } from '../dev/dev-folder'
import { checkDocker, composeArguments, runCompose } from '../dev/docker-compose'

/** `docker compose down`, keeping the data; `--reset` also drops the volumes and project. */
export async function runDevStop(command: ParsedCommand, context: CommandContext): Promise<number> {
  const { output } = context
  const root = await requireProjectRoot(context.cwd)
  const paths = localPathsOf(root)
  const environment = await readExistingEnvironment(paths)

  if (environment === undefined) {
    output.print('Nada para parar: o ambiente local ainda não foi criado.')

    return 0
  }

  await checkDocker(context.docker, root)
  const downArguments = composeArguments(environment, downCommandOf(command.options.reset))
  await runCompose(context.docker, paths.devFolder, downArguments)

  if (command.options.reset) {
    await rm(paths.projectFile, { force: true })
    output.print('Ambiente local parado e dados apagados.')

    return 0
  }

  output.print('Ambiente local parado. Os dados continuam para o próximo dev start.')

  return 0
}

function downCommandOf(reset: boolean): string[] {
  if (reset) {
    return ['down', '--volumes']
  }

  return ['down']
}
