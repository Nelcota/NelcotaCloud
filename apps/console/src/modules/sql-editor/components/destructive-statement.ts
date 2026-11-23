/**
 * Statements that erase data with no way back, named so the confirmation says which one. A plain
 * reading of the text: comments and quoted strings are dropped first so a `where` inside a string
 * never counts, and anything this misses still runs under the editor's 15 s limit as before.
 */
const COMMENTS_AND_STRINGS = /--[^\n]*|\/\*[\s\S]*?\*\/|'(?:[^']|'')*'|"(?:[^"]|"")*"/g

type DestructiveRule = { name: string; matches: (statement: string) => boolean }

const RULES: readonly DestructiveRule[] = [
  { name: 'DROP', matches: (statement) => statement.startsWith('drop ') },
  { name: 'TRUNCATE', matches: (statement) => statement.startsWith('truncate ') },
  {
    name: 'DELETE sem WHERE',
    matches: (statement) => statement.startsWith('delete ') && hasWhere(statement) === false,
  },
  {
    name: 'UPDATE sem WHERE',
    matches: (statement) => statement.startsWith('update ') && hasWhere(statement) === false,
  },
  {
    name: 'ALTER TABLE … DROP',
    matches: (statement) => statement.startsWith('alter table ') && statement.includes(' drop '),
  },
]

/** The destructive statements in `sql`, by name and without repeats; empty when there are none. */
export function destructiveStatements(sql: string): string[] {
  const names = statementsOf(sql).flatMap((statement) =>
    RULES.filter((rule) => rule.matches(statement)).map((rule) => rule.name),
  )

  return [...new Set(names)]
}

function statementsOf(sql: string): string[] {
  return sql
    .replace(COMMENTS_AND_STRINGS, ' ')
    .split(';')
    .map((statement) => statement.replace(/\s+/g, ' ').trim().toLowerCase())
    .map((statement) => `${statement} `)
}

function hasWhere(statement: string): boolean {
  return statement.includes(' where ')
}
