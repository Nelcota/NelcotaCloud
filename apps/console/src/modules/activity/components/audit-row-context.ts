import type { components } from '@/shared/api/api-schema'

type AuditEvent = components['schemas']['AuditEvent']

/** What every log row needs from the page around it. */
export type AuditRowContext = {
  projectId: string
  /** Console accounts by id, to name the member who acted. */
  memberEmails: ReadonlyMap<string, string>
  /** Off on a user's own page, where every event is about them. */
  showsUser: boolean
  /** Searches the log for an email or IP address; without it they are plain text. */
  onSearch?: (text: string) => void
  /** Opens the event's detail panel from its title. */
  onOpen: (event: AuditEvent) => void
}
