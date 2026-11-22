/** Rows a picked table's starter query reads, enough to see its shape. */
const PREVIEW_ROWS = 50

/** A first query on a picked table, with its name quoted so any name Postgres allows works. */
export function tableQuery(table: string): string {
  const quoted = `"${table.replaceAll('"', '""')}"`

  return `select * from ${quoted} limit ${PREVIEW_ROWS};`
}
