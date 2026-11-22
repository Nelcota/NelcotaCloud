import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import type { components } from '@/shared/api/api-schema'

type AuditEvent = components['schemas']['AuditEvent']

/** What every log line needs beyond its own event. */
export type LogRowView = {
  context: AuditRowContext
  /** One user's page leaves the user out: every line is theirs. */
  showsUser: boolean
  onOpen: (event: AuditEvent) => void
}
