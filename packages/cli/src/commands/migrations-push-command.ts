import type { NelcotaApi } from '../api/api-client'
import { ApiCallError } from '../api/http-json'
import type { CommandContext, Output } from '../cli/command-context'
import type { ParsedCommand } from '../cli/parse-command-line'
import type { PlanEntry } from '../migrations/migration-plan'
import { readPendingSql } from '../migrations/pending-sql'
import type { PendingMigration } from '../migrations/pending-sql'
import { MIGRATIONS_PATH } from '../migrations/remote-migrations'
import { describeEntries, readMigrationStatus } from './migration-status'

/** A migration runs DDL that may rewrite tables: wait longer than for a plain call. */
const APPLY_TIMEOUT_MS = 120_000

/** Applies pending files oldest first; refuses before the first one when histories diverge. */
export async function runMigrationsPush(
  command: ParsedCommand,
  context: CommandContext,
): Promise<number> {
  const { output } = context
  const { api, plan } = await readMigrationStatus(command, context)

  if (plan.conflicts.length > 0) {
    reportConflicts(plan.conflicts, output)

    return 1
  }

  if (plan.pending.length === 0) {
    output.print('Nada a aplicar: o banco já está em dia.')

    return 0
  }

  const pending = await readPendingSql(plan.pending)

  if (command.options.dryRun) {
    output.print('Seriam aplicadas, nesta ordem:')
    pending.forEach((migration) => output.print(`  ${migration.fileName}`))

    return 0
  }

  return applyAll(api, pending, output)
}

function reportConflicts(conflicts: readonly PlanEntry[], output: Output): void {
  output.note('O histórico do servidor não bate com os arquivos locais. Nada foi aplicado.')
  describeEntries(conflicts).forEach((line) => output.note(`  ${line}`))
  output.note('Traga os arquivos que faltam (git pull) ou corrija os nomes antes de aplicar.')
}

async function applyAll(
  api: NelcotaApi,
  pending: readonly PendingMigration[],
  output: Output,
): Promise<number> {
  for (const [index, migration] of pending.entries()) {
    const failure = await applyOne(api, migration)

    if (failure !== undefined) {
      reportFailure({ migration, failure, appliedBefore: index }, output)

      return 1
    }

    output.print(`Aplicada ${migration.fileName}`)
  }

  output.print(`${pending.length} migração(ões) aplicada(s).`)

  return 0
}

/** The API's refusal, or `undefined` once the migration is applied. */
async function applyOne(
  api: NelcotaApi,
  migration: PendingMigration,
): Promise<ApiCallError | undefined> {
  const { version, name, sql } = migration

  try {
    await api.post({
      path: MIGRATIONS_PATH,
      body: { version, name, sql },
      timeoutMs: APPLY_TIMEOUT_MS,
    })

    return undefined
  } catch (error) {
    if (error instanceof ApiCallError) {
      return error
    }

    throw error
  }
}

type Failure = { migration: PendingMigration; failure: ApiCallError; appliedBefore: number }

function reportFailure(details: Failure, output: Output): void {
  const { migration, failure, appliedBefore } = details
  output.note(
    `Falhou em ${migration.fileName}: ${failure.code} (${failure.status}): ${failure.message}`,
  )

  if (appliedBefore > 0) {
    output.note(`${appliedBefore} aplicada(s) antes do erro; as seguintes não foram enviadas.`)
  }
}
