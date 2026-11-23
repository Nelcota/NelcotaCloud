import { describe, expect, it } from 'vitest'

import { CliError } from '../src/cli/cli-error'
import { parseCommandLine } from '../src/cli/parse-command-line'

describe('parseCommandLine', () => {
  it('reads two-word commands with their argument and options', () => {
    const command = parseCommandLine(['migrations', 'new', 'create_posts'])

    expect(command.name).toBe('migrations new')
    expect(command.argument).toBe('create_posts')
  })

  it('reads the project options', () => {
    const command = parseCommandLine(['migrations', 'push', '--dry-run', '--api-url', 'http://x'])

    expect(command.options.dryRun).toBe(true)
    expect(command.options.apiUrl).toBe('http://x')
    expect(command.options.local).toBe(false)
  })

  it('shows the help without arguments, with --help or help', () => {
    expect(parseCommandLine([]).name).toBe('help')
    expect(parseCommandLine(['db', 'url', '--help']).name).toBe('help')
    expect(parseCommandLine(['help']).name).toBe('help')
    expect(parseCommandLine(['-v']).name).toBe('version')
  })

  it('reads short options', () => {
    expect(parseCommandLine(['gen', 'types', '-o', 'types.ts']).options.output).toBe('types.ts')
    expect(parseCommandLine(['db', 'reset-password', '-y']).options.yes).toBe(true)
  })

  it('refuses unknown commands and options', () => {
    expect(() => parseCommandLine(['deploy'])).toThrow(CliError)
    expect(() => parseCommandLine(['migrations'])).toThrow(CliError)
    expect(() => parseCommandLine(['init', '--force'])).toThrow('Opção desconhecida: --force')
  })

  it('refuses options of another command', () => {
    expect(() => parseCommandLine(['init', '--local'])).toThrow(
      'A opção --local não vale para nelcota init.',
    )
    expect(() => parseCommandLine(['dev', 'start', '--dry-run'])).toThrow(CliError)
  })

  it('refuses missing or extra arguments', () => {
    expect(() => parseCommandLine(['migrations', 'new'])).toThrow('Uso: nelcota migrations new')
    expect(() => parseCommandLine(['db', 'url', 'extra'])).toThrow('Uso: nelcota db url')
  })

  it('refuses a string option without a value', () => {
    expect(() => parseCommandLine(['gen', 'types', '--output'])).toThrow(
      'Valor inválido para a opção --output',
    )
  })
})
