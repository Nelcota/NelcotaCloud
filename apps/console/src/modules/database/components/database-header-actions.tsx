import CodeSquare from '~icons/solar/code-square-linear'
import type { JSX } from 'react'

import { CreateTableDialog } from '@/modules/database/components/create-table-dialog'
import { databaseSnippets } from '@/modules/database/components/database-snippets'
import { usePublishableKey } from '@/modules/database/queries/use-publishable-key'
import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import { RouterLink } from '@/shared/routing/router-link'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { Button } from '@/shared/ui/primitives/button'

/** The API sheet, the SQL editor and, as the page's main action, a new table. */
export function DatabaseHeaderActions({ projectId }: { projectId: string }): JSX.Element {
  const schema = useSchemaQuery(projectId)
  const publishableKey = usePublishableKey(projectId)

  return (
    <>
      <ApiSheet
        title="Banco de dados pela API"
        description="Os apps leem e escrevem as tabelas de public como o usuário logado; as políticas decidem o que cada um alcança."
        snippets={databaseSnippets({ schema: schema.data, publishableKey })}
      />
      <Button asChild variant="outline">
        <RouterLink href={`/projects/${projectId}/sql`}>
          <CodeSquare aria-hidden data-icon="inline-start" />
          Editor SQL
        </RouterLink>
      </Button>
      <CreateTableDialog projectId={projectId} />
    </>
  )
}
