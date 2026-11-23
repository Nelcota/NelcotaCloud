import { spawn } from 'node:child_process'

import { CliError } from '../cli/cli-error'

export type DockerRun = {
  args: readonly string[]
  cwd: string
  /** Hides Docker's output (availability checks); otherwise it streams to the terminal. */
  quiet?: boolean
}

/** Runs `docker <args>` and resolves with its exit code. */
export type DockerRunner = (run: DockerRun) => Promise<number>

export const DOCKER_MISSING_MESSAGE =
  'Docker não encontrado. Instale o Docker (Desktop ou Engine com o plugin compose) e tente de novo.'

export const runDocker: DockerRunner = (run) =>
  new Promise((resolve, reject) => {
    const child = spawn('docker', [...run.args], { cwd: run.cwd, stdio: stdioOf(run) })
    child.on('error', (error: NodeJS.ErrnoException) => {
      reject(describeSpawnError(error))
    })
    child.on('close', (code) => {
      resolve(code ?? 1)
    })
  })

function stdioOf(run: DockerRun): 'ignore' | 'inherit' {
  if (run.quiet === true) {
    return 'ignore'
  }

  return 'inherit'
}

function describeSpawnError(error: NodeJS.ErrnoException): Error {
  if (error.code === 'ENOENT') {
    return new CliError(DOCKER_MISSING_MESSAGE)
  }

  return error
}
