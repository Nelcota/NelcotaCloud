import type { JSX } from 'react'

import { useDatabaseTypesQuery } from '@/modules/database/queries/use-database-types-query'
import type { CodeLanguage } from '@/shared/lib/highlight-code'
import { CodeBlock } from '@/shared/ui/code-block'
import { CopyButton } from '@/shared/ui/copy-button'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

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
    <div className="grid gap-5">
      <Snippet label="src/database.types.ts" code={types.data} language="typescript" isTall />
      <Snippet label="Use no cliente" code={USAGE} language="typescript" />
      <Snippet label="Ou gere pela CLI" code={CLI_COMMAND} language="shell" />
    </div>
  )
}

type SnippetProps = {
  label: string
  code: string
  language: CodeLanguage
  /** Long files scroll inside a fixed height instead of stretching the sheet. */
  isTall?: boolean
}

function Snippet({ label, code, language, isTall }: SnippetProps): JSX.Element {
  return (
    <section className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-mono text-sm font-medium">{label}</h3>
        <CopyButton value={code} description={label} />
      </div>
      <div className={scrollClass(isTall === true)}>
        <CodeBlock code={code} language={language} />
      </div>
    </section>
  )
}

function scrollClass(isTall: boolean): string {
  if (isTall) {
    return 'max-h-96 overflow-y-auto rounded-xl'
  }

  return ''
}

function TypesLoading(props: { error: Error | null; onRetry: () => void }): JSX.Element {
  if (props.error !== null) {
    return <LoadError error={props.error} onRetry={props.onRetry} />
  }

  return <Skeleton aria-label="Gerando os tipos" className="h-72 rounded-xl" />
}
