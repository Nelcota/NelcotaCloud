import { ApiCallError } from './api/http-json'
import { processContext } from './cli/process-context'
import { runCli } from './cli/run-cli'

/** Results go to stdout, messages and errors to stderr; the exit code tells scripts which. */
async function main(): Promise<void> {
  process.exitCode = await runCli(process.argv.slice(2), processContext())
}

main().catch((error: unknown) => {
  process.stderr.write(`nelcota: ${describe(error)}\n`)
  process.exitCode = 1
})

function describe(error: unknown): string {
  if (error instanceof ApiCallError) {
    return `${error.code} (${error.status}): ${error.message}`
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Falha desconhecida.'
}
