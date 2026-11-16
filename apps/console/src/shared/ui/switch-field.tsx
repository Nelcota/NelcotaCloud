import type { JSX } from 'react'
import { useId } from 'react'

import { Label } from '@/shared/ui/label'
import { Switch } from '@/shared/ui/switch'

type SwitchFieldProps = {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

/** A switch named by its visible label, so screen readers announce what it toggles. */
export function SwitchField({ label, checked, onCheckedChange }: SwitchFieldProps): JSX.Element {
  const labelId = useId()

  return (
    <div className="flex items-center gap-3">
      <Switch aria-labelledby={labelId} checked={checked} onCheckedChange={onCheckedChange} />
      <Label id={labelId}>{label}</Label>
    </div>
  )
}
