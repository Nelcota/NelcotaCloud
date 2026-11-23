import type { CommandContext } from '../cli/command-context'
import { localPathsOf } from '../config/local-paths'
import { requireProjectRoot } from '../config/project-root'
import { readExistingEnvironment } from '../dev/dev-folder'
import { checkDocker, composeArguments, runCompose } from '../dev/docker-compose'

/** The containers of the local stack, as `docker compose ps` shows them. */
export async function runDevStatus(context: CommandContext): Promise<number> {
  const root = await requireProjectRoot(context.cwd)
  const paths = localPathsOf(root)
  const environment = await readExistingEnvironment(paths)

  if (environment === undefined) {
    context.output.print('O ambiente local ainda não foi criado. Rode nelcota dev start.')

    return 0
  }

  await checkDocker(context.docker, root)
  await runCompose(context.docker, paths.devFolder, composeArguments(environment, ['ps', '--all']))

  return 0
}
