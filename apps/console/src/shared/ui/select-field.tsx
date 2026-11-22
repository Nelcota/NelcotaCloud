import { useId, type JSX, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { FieldMessages } from '@/shared/ui/field-messages'
import { describedBy } from '@/shared/ui/field-ids'
import { Field, FieldLabel } from '@/shared/ui/primitives/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/primitives/select'

export type SelectOption = { label: string; value: string; disabled?: boolean }

type SelectFieldProps = {
  label: ReactNode
  options: readonly SelectOption[]
  value: string
  onValueChange: (value: string) => void
  hint?: ReactNode
  error?: ReactNode
  placeholder?: string
  isLabelHidden?: boolean
  className?: string
}

/** A labelled choice among a few options. */
export function SelectField(props: SelectFieldProps): JSX.Element {
  const id = useId()

  return (
    <Field className={cn('gap-1.5', props.className)}>
      <FieldLabel htmlFor={id} className={cn(props.isLabelHidden === true && 'sr-only')}>
        {props.label}
      </FieldLabel>
      <Select value={props.value} onValueChange={props.onValueChange}>
        <SelectTrigger
          id={id}
          className="w-full min-w-0"
          aria-describedby={describedBy(id, props.hint, props.error)}
        >
          <SelectValue placeholder={props.placeholder ?? 'Selecione'} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {props.options.map((option) => (
              <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldMessages id={id} hint={props.hint} error={props.error} />
    </Field>
  )
}
