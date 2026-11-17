import type { JSX } from 'react'
import { useId } from 'react'

import { Label } from '@/shared/ui/label'

type JsonFieldProps = {
  label: string
  hint: string
  value: string
  error: string | null
  onChange: (value: string) => void
}

/** A labelled monospace text area for a JSON document, with its hint or its parse error. */
export function JsonField(props: JsonFieldProps): JSX.Element {
  const id = useId()
  const noteId = `${id}-note`

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{props.label}</Label>
      <textarea
        id={id}
        rows={6}
        spellCheck={false}
        aria-describedby={noteId}
        aria-invalid={props.error !== null}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 min-h-28 w-full resize-y rounded-lg border bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:ring-3 aria-invalid:ring-3"
      />
      <FieldNote id={noteId} hint={props.hint} error={props.error} />
    </div>
  )
}

type FieldNoteProps = { id: string; hint: string; error: string | null }

function FieldNote({ id, hint, error }: FieldNoteProps): JSX.Element {
  if (error !== null) {
    return (
      <p id={id} className="text-destructive text-xs">
        {error}
      </p>
    )
  }

  return (
    <p id={id} className="text-muted-foreground text-xs">
      {hint}
    </p>
  )
}
