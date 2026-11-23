import { createInterface } from 'node:readline/promises'
import { setTimeout as delay } from 'node:timers/promises'

import { runDocker } from '../dev/docker-runner'
import type { CommandContext } from './command-context'

const YES_ANSWERS = new Set(['s', 'sim', 'y', 'yes'])

/** The real outside world: this process's folder, environment, terminal, network and Docker. */
export function processContext(): CommandContext {
  return {
    cwd: process.cwd(),
    environment: process.env,
    output: {
      print: (text) => process.stdout.write(`${text}\n`),
      note: (text) => process.stderr.write(`${text}\n`),
    },
    fetch: (input, init) => fetch(input, init),
    docker: runDocker,
    confirm: confirmInTerminal,
    isInteractive: () => process.stdin.isTTY === true,
    now: () => new Date(),
    sleep: (milliseconds) => delay(milliseconds),
  }
}

/** Asks on stderr, so stdout stays clean for the command's result. */
async function confirmInTerminal(question: string): Promise<boolean> {
  const terminal = createInterface({ input: process.stdin, output: process.stderr })

  try {
    const answer = await terminal.question(question)

    return YES_ANSWERS.has(answer.trim().toLowerCase())
  } finally {
    terminal.close()
  }
}
