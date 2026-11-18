import type { PolicyDraft } from '@/modules/database/components/policy-draft'
import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']

/** The column that names a row's owner in the common "own rows" policy. */
const OWNER_COLUMN = 'user_id'

const OWN_ROWS = `${OWNER_COLUMN} = auth.uid()`

export type PolicyTemplate = { label: string; draft: PolicyDraft }

const PUBLIC_READ: PolicyTemplate = {
  label: 'Todos leem',
  draft: {
    name: 'public_read',
    command: 'select',
    roles: ['anon', 'authenticated'],
    using: 'true',
    withCheck: '',
  },
}

const OWN_ROWS_ONLY: PolicyTemplate = {
  label: 'Cada usuário só nas próprias linhas',
  draft: {
    name: 'own_rows',
    command: 'all',
    roles: ['authenticated'],
    using: OWN_ROWS,
    withCheck: OWN_ROWS,
  },
}

/** The starting points that fit this table: "own rows" needs a `user_id` column. */
export function templatesFor(table: TableOverview): PolicyTemplate[] {
  if (table.columns.some((column) => column.name === OWNER_COLUMN)) {
    return [OWN_ROWS_ONLY, PUBLIC_READ]
  }

  return [PUBLIC_READ]
}
