/** Prefix shared by the project's audit queries and the mutations that refresh them. */
export function auditEventsKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'audit-events']
}
