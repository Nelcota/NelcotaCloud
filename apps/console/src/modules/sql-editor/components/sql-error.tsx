import type { JSX } from 'react'

import { ApiError } from '@/shared/api/api-error'
import { describeError } from '@/shared/api/describe-error'
import { Notice } from '@/shared/ui/notice'

/** The API's code for a statement Postgres refused; its message is Postgres's own. */
const SQL_ERROR = 'sql_error'

/** Postgres's refusal as it wrote it, with the API's code and status to search or report. */
export function SqlError({ error }: { error: Error }): JSX.Element {
  return (
    <div className="p-4">
      <Notice tone="error" title={titleOf(error)}>
        <span className="flex flex-col gap-2">
          <span className="font-mono text-sm whitespace-pre-wrap text-foreground wrap-anywhere">
            {messageOf(error)}
          </span>
          <ErrorCode error={error} />
        </span>
      </Notice>
    </div>
  )
}

function ErrorCode({ error }: { error: Error }): JSX.Element | null {
  if (error instanceof ApiError === false) {
    return null
  }

  return (
    <span className="font-mono text-xs text-muted-foreground">
      {error.code} · HTTP {error.status}
    </span>
  )
}

function titleOf(error: Error): string {
  if (isSqlError(error)) {
    return 'O Postgres recusou'
  }

  return 'A consulta falhou'
}

/** Postgres's text is the detail itself; other refusals read in Portuguese. */
function messageOf(error: Error): string {
  if (isSqlError(error)) {
    return error.message
  }

  return describeError(error)
}

function isSqlError(error: Error): boolean {
  return error instanceof ApiError && error.code === SQL_ERROR
}
