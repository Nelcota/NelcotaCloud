import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { NelcotaApi } from '../api/api-client'
import { asRecord, stringField } from '../api/json-fields'
import type { CommandContext } from '../cli/command-context'
import { displayPath } from '../cli/display-path'
import type { ParsedCommand } from '../cli/parse-command-line'
import { resolveApiTarget } from '../config/resolve-api-target'

const TYPES_PATH = '/database/v1/types'

/** Prints the project's generated TypeScript, or writes it to `--output`. */
export async function runGenTypes(
  command: ParsedCommand,
  context: CommandContext,
): Promise<number> {
  const { output, cwd } = context
  const target = await resolveApiTarget(command.options, context)
  const api = new NelcotaApi(target, context.fetch)
  const payload = await api.get({ path: TYPES_PATH })
  const typescript = withFinalNewline(stringField(asRecord(payload, 'types'), 'typescript'))
  const outputFile = command.options.output

  if (outputFile === undefined) {
    output.print(typescript.replace(/\n$/, ''))

    return 0
  }

  const path = resolve(cwd, outputFile)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, typescript)
  output.note(`Tipos gravados em ${displayPath(cwd, path)}`)

  return 0
}

function withFinalNewline(text: string): string {
  if (text.endsWith('\n')) {
    return text
  }

  return `${text}\n`
}
