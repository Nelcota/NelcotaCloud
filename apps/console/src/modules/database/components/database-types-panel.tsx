import type { JSX } from 'react'

import { useDatabaseTypesQuery } from '@/modules/database/queries/use-database-types-query'
import { CodeBlock } from '@/shared/ui/code-block'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

const USAGE = `import { createClient } from '@nelcota/sdk'
import type { Database } from './database.types'

const nelcota = createClient<Database>({ url, publishableKey })`

const CLI_COMMAND = 'npx nelcota gen types --output src/database.types.ts'

/** The project's tables, views and functions as TypeScript, for the typed SDK client. */
export function DatabaseTypesPanel({ projectId }: { projectId: string }): JSX.Element {
  const types = useDatabaseTypesQuery(projectId)

  if (types.data === undefined) {
    return <TypesLoading error={types.error} onRetry={() => types.refetch()} />
  }

  return (
    <div className="grid gap-4">
      <CodeBlock code={types.data} title="database.types.ts" maxHeight={360} />
      <CodeBlock code={USAGE} title="app.ts" />
      <CodeBlock code={CLI_COMMAND} title="shell" copyLabel="comando da CLI" />
    </div>
  )
}

function TypesLoading(props: { error: Error | null; onRetry: () => void }): JSX.Element {
  if (props.error !== null) {
    return <LoadError error={props.error} onRetry={props.onRetry} />
  }

  return (
    <div role="status" aria-label="Gerando os tipos">
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
