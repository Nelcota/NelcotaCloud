import { parseArgs } from 'node:util'

import { CliError } from './cli-error'
import { findCommand } from './command-catalog'
import type { CommandName, CommandShape } from './command-catalog'

export type CliOptions = {
  apiUrl: string | undefined
  local: boolean
  dryRun: boolean
  output: string | undefined
  yes: boolean
  slug: string | undefined
  siteUrl: string | undefined
  reset: boolean
}

export type ParsedCommand = {
  name: CommandName
  argument: string | undefined
  options: CliOptions
}

const OPTION_DEFINITIONS = {
  help: { type: 'boolean', short: 'h' },
  version: { type: 'boolean', short: 'v' },
  'api-url': { type: 'string' },
  local: { type: 'boolean' },
  'dry-run': { type: 'boolean' },
  output: { type: 'string', short: 'o' },
  yes: { type: 'boolean', short: 'y' },
  slug: { type: 'string' },
  'site-url': { type: 'string' },
  reset: { type: 'boolean' },
} as const

type ParsedValues = ReturnType<typeof readArguments>['values']

/** Turns `process.argv.slice(2)` into one known command with only the options it accepts. */
export function parseCommandLine(argv: readonly string[]): ParsedCommand {
  const { values, positionals } = readArguments(argv)
  const options = optionsOf(values)

  if (values.help === true || positionals[0] === 'help') {
    return { name: 'help', argument: undefined, options }
  }

  if (values.version === true) {
    return { name: 'version', argument: undefined, options }
  }

  if (positionals.length === 0) {
    return { name: 'help', argument: undefined, options }
  }

  const command = findCommand(positionals)

  if (command === undefined) {
    throw new CliError(`Comando desconhecido: ${positionals.join(' ')}. Veja nelcota --help.`)
  }

  const commandArguments = positionals.slice(command.name.split(' ').length)
  checkShape(command, commandArguments.length)
  checkOptions(command, givenOptions(values))

  return { name: command.name, argument: commandArguments[0], options }
}

function readArguments(argv: readonly string[]) {
  try {
    return parseArgs({
      args: [...argv],
      options: OPTION_DEFINITIONS,
      strict: true,
      allowPositionals: true,
    })
  } catch (error) {
    throw new CliError(describeParseError(error))
  }
}

function describeParseError(error: unknown): string {
  const message = messageOf(error)
  const option = /(--[a-z][a-z-]*)/.exec(message)?.[1] ?? /'(-[^' ,]+)/.exec(message)?.[1] ?? ''

  if (codeOf(error) === 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE') {
    return `Valor inválido para a opção ${option}. Veja nelcota --help.`
  }

  return `Opção desconhecida: ${option}. Veja nelcota --help.`
}

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return ''
}

function codeOf(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return error.code
  }

  return undefined
}

function optionsOf(values: ParsedValues): CliOptions {
  return {
    apiUrl: values['api-url'],
    local: values.local === true,
    dryRun: values['dry-run'] === true,
    output: values.output,
    yes: values.yes === true,
    slug: values.slug,
    siteUrl: values['site-url'],
    reset: values.reset === true,
  }
}

function givenOptions(values: ParsedValues): string[] {
  return Object.entries(values)
    .filter(([name, value]) => value !== undefined && name !== 'help' && name !== 'version')
    .map(([name]) => name)
}

function checkShape(command: CommandShape, argumentCount: number): void {
  if (argumentCount === command.argumentCount) {
    return
  }

  throw new CliError(`Uso: nelcota ${command.usage}`)
}

function checkOptions(command: CommandShape, names: readonly string[]): void {
  const accepted: readonly string[] = command.options
  const refused = names.find((name) => accepted.includes(name) === false)

  if (refused === undefined) {
    return
  }

  throw new CliError(`A opção --${refused} não vale para nelcota ${command.name}.`)
}
