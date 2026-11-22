import {
  type SampleValue,
  filterColumn,
  insertColumns,
  sampleRow,
  sampleValue,
  updateColumn,
} from '@/modules/database/components/sample-values'
import { clientLines, jsString } from '@/modules/database/components/snippet-syntax'
import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']

/** Past this many columns the read example selects `*` instead of naming them. */
const MAX_NAMED_COLUMNS = 6

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

/** Select, insert, update and delete on this table with the SDK, using its real columns. */
export function tableSdkSnippet(table: TableOverview, publishableKey: string | null): string {
  const from = `nelcota.from(${jsString(table.name)})`
  const lines = [
    ...clientLines(publishableKey),
    '',
    '// Ler: só as linhas que as políticas liberam para quem está logado',
    `const { data } = await ${from}.select(${jsString(selectList(table))}).limit(20).execute()`,
    '',
    '// Inserir',
    `await ${from}.insert(${jsObject(sampleRow(insertColumns(table.columns)))}).execute()`,
    ...filteredLines(table, from),
  ]

  return lines.join('\n')
}

/** Updates and deletes need a filter; a table without columns has nothing to filter on. */
function filteredLines(table: TableOverview, from: string): string[] {
  const filter = filterColumn(table.columns)

  if (filter === undefined) {
    return []
  }

  const where = `.eq(${jsString(filter.name)}, ${jsValue(sampleValue(filter.type))})`

  return [
    ...updateLines(table, from, where),
    '',
    '// Excluir',
    `await ${from}.delete()${where}.execute()`,
  ]
}

function updateLines(table: TableOverview, from: string, where: string): string[] {
  const column = updateColumn(table.columns)

  if (column === undefined) {
    return []
  }

  const values = jsObject(sampleRow([column]))

  return [
    '',
    '// Atualizar: update e delete precisam de um filtro',
    `await ${from}.update(${values})${where}.execute()`,
  ]
}

function selectList(table: TableOverview): string {
  const names = table.columns.map((column) => column.name)

  if (names.length === 0 || names.length > MAX_NAMED_COLUMNS) {
    return '*'
  }

  return names.join(', ')
}

function jsObject(row: Record<string, SampleValue>): string {
  const entries = Object.entries(row).map(([name, value]) => `${jsKey(name)}: ${jsValue(value)}`)

  if (entries.length === 0) {
    return '{}'
  }

  return `{ ${entries.join(', ')} }`
}

function jsKey(name: string): string {
  if (IDENTIFIER.test(name)) {
    return name
  }

  return jsString(name)
}

function jsValue(value: SampleValue): string {
  if (typeof value === 'string') {
    return jsString(value)
  }

  return JSON.stringify(value)
}
