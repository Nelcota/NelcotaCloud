import type { DockerRunner } from '../dev/docker-runner'

/** Where text goes: results on stdout, notes and warnings on stderr. */
export type Output = {
  print: (text: string) => void
  note: (text: string) => void
}

export type FetchFunction = (input: string, init?: RequestInit) => Promise<Response>

/**
 * Everything a command reads from or does to the outside world, injected so tests run without
 * Docker, a server or a terminal.
 */
export type CommandContext = {
  cwd: string
  environment: Record<string, string | undefined>
  output: Output
  fetch: FetchFunction
  docker: DockerRunner
  confirm: (question: string) => Promise<boolean>
  isInteractive: () => boolean
  now: () => Date
  sleep: (milliseconds: number) => Promise<void>
}
