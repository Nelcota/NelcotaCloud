import { useId, type JSX, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { FieldMessages } from '@/shared/ui/field-messages'
import { describedBy } from '@/shared/ui/field-ids'
import { Checkbox } from '@/shared/ui/primitives/checkbox'
import { Field, FieldContent, FieldLabel } from '@/shared/ui/primitives/field'
import { Switch } from '@/shared/ui/primitives/switch'

type ToggleFieldProps = {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
}

/** A setting turned on or off: label and hint on the left, the switch on the right. */
export function SwitchField(props: ToggleFieldProps): JSX.Element {
  const id = useId()

  return (
    <Field
      orientation="horizontal"
      className={cn('items-start justify-between gap-4', props.className)}
      data-disabled={props.disabled === true || undefined}
    >
      <FieldContent className="min-w-0">
        <FieldLabel htmlFor={id}>{props.label}</FieldLabel>
        <FieldMessages id={id} hint={props.hint} error={props.error} />
      </FieldContent>
      <Switch
        id={id}
        checked={props.checked}
        disabled={props.disabled}
        aria-describedby={describedBy(id, props.hint, props.error)}
        onCheckedChange={props.onCheckedChange}
      />
    </Field>
  )
}

/** A choice ticked in a list of options or above a destructive confirmation. */
export function CheckboxField(props: ToggleFieldProps): JSX.Element {
  const id = useId()

  return (
    <Field
      orientation="horizontal"
      className={cn('items-start gap-3', props.className)}
      data-disabled={props.disabled === true || undefined}
    >
      <Checkbox
        id={id}
        checked={props.checked}
        disabled={props.disabled}
        aria-describedby={describedBy(id, props.hint, props.error)}
        onCheckedChange={(checked) => props.onCheckedChange(checked === true)}
      />
      <FieldContent className="min-w-0">
        <FieldLabel htmlFor={id}>{props.label}</FieldLabel>
        <FieldMessages id={id} hint={props.hint} error={props.error} />
      </FieldContent>
    </Field>
  )
}
