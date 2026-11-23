import type { CommandContext } from '../cli/command-context'
import type { CliOptions } from '../cli/parse-command-line'
import { checkedApiUrl, readRemoteTarget } from './api-target'
import type { ApiTarget } from './api-target'
import { localPathsOf } from './local-paths'
import { readLocalProject, targetOfLocalProject } from './local-project'
import { requireProjectRoot } from './project-root'

/** `--local` reads the dev stack's project; otherwise the environment names the project. */
export async function resolveApiTarget(
  options: CliOptions,
  context: CommandContext,
): Promise<ApiTarget> {
  if (options.local === false) {
    return readRemoteTarget(context.environment, options.apiUrl)
  }

  const root = await requireProjectRoot(context.cwd)
  const project = await readLocalProject(localPathsOf(root).projectFile)
  const target = targetOfLocalProject(project)

  if (options.apiUrl === undefined) {
    return target
  }

  return { ...target, apiUrl: checkedApiUrl(options.apiUrl) }
}
