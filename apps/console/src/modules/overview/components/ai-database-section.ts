import type { AiColumn, AiTable } from '@/modules/overview/components/ai-context'

/** Keeps the prompt short enough to paste; the rest is one click away in the console. */
const MAX_TABLES = 40

const HEADING = [
  '## Banco de dados (schema `public`)',
  "Leia e grave como o usuário logado: `await nelcota.from('tabela').select('*').eq('coluna', valor).execute()`.",
  '',
]

/** The `public` schema for the prompt; nothing when the schema could not be read. */
export function databaseSection(tables: AiTable[] | null): string {
  if (tables === null) {
    return ''
  }

  if (tables.length === 0) {
    return [...HEADING, 'Ainda não há tabelas.'].join('\n')
  }

  const lines = tables.slice(0, MAX_TABLES).map(tableLine)

  return [...HEADING, ...lines, restLine(tables.length)].filter((line) => line !== '').join('\n')
}

function tableLine(table: AiTable): string {
  const columns = table.columns.map(columnText).join(', ')

  return `- \`${table.name}\`${kindText(table.kind)}: ${securityText(table)}. Colunas: ${columns}`
}

function columnText(column: AiColumn): string {
  const marks = [column.type]

  if (column.isPrimaryKey) {
    marks.push('PK')
  }

  if (column.isNullable === false && column.isPrimaryKey === false) {
    marks.push('not null')
  }

  return `${column.name} (${marks.join(', ')})`
}

function kindText(kind: string): string {
  if (kind === 'table') {
    return ''
  }

  return ` (${kind})`
}

function securityText(table: AiTable): string {
  if (table.kind !== 'table') {
    return 'segue o RLS das tabelas que lê'
  }

  if (table.isRlsEnabled === false) {
    return 'RLS desativado'
  }

  if (table.policyCount === 0) {
    return 'RLS ligado, nenhuma política (fechada para o app)'
  }

  return `RLS ligado, ${table.policyCount} ${policiesWord(table.policyCount)}`
}

function policiesWord(count: number): string {
  if (count === 1) {
    return 'política'
  }

  return 'políticas'
}

function restLine(total: number): string {
  if (total <= MAX_TABLES) {
    return ''
  }

  return `- e mais ${total - MAX_TABLES} tabelas.`
}
