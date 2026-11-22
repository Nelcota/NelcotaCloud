/** The table's page in the console. */
export function tableHref(projectId: string, table: string): string {
  return `/projects/${projectId}/database/${encodeURIComponent(table)}`
}
