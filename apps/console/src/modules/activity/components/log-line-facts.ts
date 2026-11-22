import { extraDetails } from '@/modules/activity/components/audit-event-details'
import { originText } from '@/modules/activity/components/audit-event-text'
import { METHOD_LABELS } from '@/modules/activity/components/audit-labels'
import type { LogRowView } from '@/modules/activity/components/log-row-view'
import type { components } from '@/shared/api/api-schema'

type AuditEvent = components['schemas']['AuditEvent']

/** One `chave=valor` chip of a log line. */
export type LogFact = { key: string; value: string }

/** Enough of a request id to match it in the server's logs by eye; the panel has all of it. */
const SHORT_REQUEST_ID = 8

/** The line's chips in reading order: who, from where, how, then the rest of the details. */
export function logFactsOf(event: AuditEvent, view: LogRowView): LogFact[] {
  const facts: (LogFact | null)[] = [
    userFact(event, view.showsUser),
    textFact('ip', event.ip_address),
    { key: 'origem', value: originText(event, view.context) },
    methodFact(event),
    ...extraDetails(event).map(([key, value]) => ({ key, value })),
    textFact('req', event.request_id?.slice(0, SHORT_REQUEST_ID)),
  ]

  return facts.filter((fact): fact is LogFact => fact !== null)
}

function userFact(event: AuditEvent, showsUser: boolean): LogFact | null {
  if (showsUser === false) {
    return null
  }

  return textFact('usuário', event.email)
}

function methodFact(event: AuditEvent): LogFact | null {
  const method = event.login_method ?? null

  if (method === null) {
    return null
  }

  return { key: 'método', value: METHOD_LABELS[method] }
}

function textFact(key: string, value: string | null | undefined): LogFact | null {
  if (value === null || value === undefined || value === '') {
    return null
  }

  return { key, value }
}
