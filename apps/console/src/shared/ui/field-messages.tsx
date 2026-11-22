import type { JSX, ReactNode } from 'react'

import { errorId, hintId } from '@/shared/ui/field-ids'
import { FieldDescription, FieldError } from '@/shared/ui/primitives/field'

/** The hint and the error under a control, linked to it by id. */
export function FieldMessages({
  id,
  hint,
  error,
}: {
  id: string
  hint?: ReactNode
  error?: ReactNode
}): JSX.Element {
  const hintElementId = hintId(id, hint)
  const errorElementId = errorId(id, error)

  return (
    <>
      {hintElementId !== undefined && (
        <FieldDescription id={hintElementId}>{hint}</FieldDescription>
      )}
      {errorElementId !== undefined && <FieldError id={errorElementId}>{error}</FieldError>}
    </>
  )
}
