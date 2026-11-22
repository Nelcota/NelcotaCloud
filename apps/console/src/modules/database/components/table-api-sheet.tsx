import type { JSX } from 'react'

import { tableCurlSnippet } from '@/modules/database/components/table-curl-snippet'
import { tableSdkSnippet } from '@/modules/database/components/table-sdk-snippet'
import { usePublishableKey } from '@/modules/database/queries/use-publishable-key'
import type { components } from '@/shared/api/api-schema'
import { ApiSheet } from '@/shared/ui/api-sheet'

type TableOverview = components['schemas']['TableOverview']

type TableApiSheetProps = { projectId: string; table: TableOverview }

/** Select, insert, update and delete on this table, with its real column names. */
export function TableApiSheet({ projectId, table }: TableApiSheetProps): JSX.Element | null {
  const publishableKey = usePublishableKey(projectId)

  return (
    <ApiSheet
      title={`${table.name} pela API`}
      description="Como o usuário logado: as políticas da tabela decidem quais linhas cada requisição alcança."
      snippets={[
        { label: 'SDK', title: 'app.ts', code: tableSdkSnippet(table, publishableKey) },
        { label: 'curl', title: 'shell', code: tableCurlSnippet(table, publishableKey) },
      ]}
    />
  )
}
