import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'

type AuditSummary = components['schemas']['AuditSummary']

/** The reason a project reads healthy, from the period's own login counts. */
export function healthySentenceOf(summary: AuditSummary, days: number): string {
  const attempts = summary.logins + summary.failures
  const period = `nos últimos ${days} dias`

  if (attempts === 0) {
    return `Nenhum login ${period}, nada a revisar.`
  }

  if (summary.failures === 0) {
    return `Nenhum login recusado em ${loginsText(attempts)} ${period}.`
  }

  return `${refusedText(summary.failures)} em ${loginsText(attempts)} ${period}, abaixo do que merece atenção.`
}

function loginsText(count: number): string {
  if (count === 1) {
    return '1 tentativa'
  }

  return `${formatCount(count)} tentativas`
}

function refusedText(count: number): string {
  if (count === 1) {
    return '1 login recusado'
  }

  return `${formatCount(count)} logins recusados`
}
