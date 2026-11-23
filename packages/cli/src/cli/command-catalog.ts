export type OptionName =
  | 'api-url'
  | 'local'
  | 'dry-run'
  | 'output'
  | 'yes'
  | 'slug'
  | 'site-url'
  | 'reset'

export type CommandName =
  | 'help'
  | 'version'
  | 'init'
  | 'migrations new'
  | 'migrations list'
  | 'migrations push'
  | 'gen types'
  | 'db url'
  | 'db reset-password'
  | 'dev start'
  | 'dev stop'
  | 'dev status'

/** What a command accepts: how many positional arguments and which options. */
export type CommandShape = {
  name: CommandName
  argumentCount: number
  options: readonly OptionName[]
  /** Shown when the arguments do not fit, after `Uso: nelcota`. */
  usage: string
}

const PROJECT_OPTIONS: readonly OptionName[] = ['api-url', 'local']

export const COMMANDS: readonly CommandShape[] = [
  { name: 'help', argumentCount: 0, options: [], usage: 'help' },
  { name: 'version', argumentCount: 0, options: [], usage: '--version' },
  { name: 'init', argumentCount: 0, options: [], usage: 'init' },
  { name: 'migrations new', argumentCount: 1, options: [], usage: 'migrations new <nome>' },
  {
    name: 'migrations list',
    argumentCount: 0,
    options: PROJECT_OPTIONS,
    usage: 'migrations list [--local] [--api-url <url>]',
  },
  {
    name: 'migrations push',
    argumentCount: 0,
    options: [...PROJECT_OPTIONS, 'dry-run'],
    usage: 'migrations push [--dry-run] [--local] [--api-url <url>]',
  },
  {
    name: 'gen types',
    argumentCount: 0,
    options: [...PROJECT_OPTIONS, 'output'],
    usage: 'gen types [--output <arquivo>] [--local] [--api-url <url>]',
  },
  {
    name: 'db url',
    argumentCount: 0,
    options: PROJECT_OPTIONS,
    usage: 'db url [--local] [--api-url <url>]',
  },
  {
    name: 'db reset-password',
    argumentCount: 0,
    options: [...PROJECT_OPTIONS, 'yes'],
    usage: 'db reset-password [--yes] [--local] [--api-url <url>]',
  },
  {
    name: 'dev start',
    argumentCount: 0,
    options: ['slug', 'site-url'],
    usage: 'dev start [--slug <slug>] [--site-url <url>]',
  },
  { name: 'dev stop', argumentCount: 0, options: ['reset'], usage: 'dev stop [--reset]' },
  { name: 'dev status', argumentCount: 0, options: [], usage: 'dev status' },
]

/** The command whose words open the positional arguments, longest name first. */
export function findCommand(words: readonly string[]): CommandShape | undefined {
  const twoWords = words.slice(0, 2).join(' ')
  const oneWord = words.slice(0, 1).join(' ')

  return (
    COMMANDS.find((command) => command.name === twoWords && command.name.includes(' ')) ??
    COMMANDS.find((command) => command.name === oneWord && command.name.includes(' ') === false)
  )
}
