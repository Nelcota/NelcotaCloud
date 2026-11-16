import type { JSX } from 'react'
import { useId } from 'react'

import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'

type SwitchFieldProps = {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/** A switch named by its visible label, so screen readers announce what it toggles. */
export function SwitchField(props: SwitchFieldProps): JSX.Element {
  const labelId = useId()
  const descriptionId = `${labelId}-description`

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
      <div className="grid gap-1">
        <Label id={labelId}>{props.label}</Label>
        <SwitchDescription id={descriptionId} description={props.description} />
      </div>
      <Switch
        aria-labelledby={labelId}
        aria-describedby={describedBy(props.description, descriptionId)}
        checked={props.checked}
        onCheckedChange={props.onCheckedChange}
      />
    </div>
  )
}

function describedBy(description: string | undefined, id: string): string | undefined {
  if (description === undefined) {
    return undefined
  }

  return id
}

function SwitchDescription({
  id,
  description,
}: {
  id: string
  description?: string
}): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return (
    <p id={id} className="text-muted-foreground text-xs text-pretty">
      {description}
    </p>
  )
}
