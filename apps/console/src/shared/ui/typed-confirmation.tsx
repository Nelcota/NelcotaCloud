import type { JSX } from 'react'
import { useId } from 'react'

import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

type TypedConfirmationProps = {
  expected: string | undefined
  value: string
  onChange: (value: string) => void
}

/**
 * For actions that cannot be undone at all: the user types the target before confirming. The
 * text to type is set apart in mono, so it is copied exactly rather than read out of a sentence.
 */
export function TypedConfirmation({
  expected,
  value,
  onChange,
}: TypedConfirmationProps): JSX.Element | null {
  const id = useId()

  if (expected === undefined) {
    return null
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="flex-wrap">
        Digite
        <code className="bg-muted text-foreground rounded-md px-1.5 py-0.5 font-mono text-[0.95em] select-all">
          {expected}
        </code>
        para confirmar
      </Label>
      <Input
        id={id}
        autoFocus
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
