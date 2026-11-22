/** What every activity row needs to know beyond its own event. */
export type AuditRowContext = {
  projectId: string
  /** Console accounts by id, to name the member who acted. */
  memberEmails: ReadonlyMap<string, string>
  /** The signed-in console account, named "Você" in the sentences. */
  currentAccountId: string
}
