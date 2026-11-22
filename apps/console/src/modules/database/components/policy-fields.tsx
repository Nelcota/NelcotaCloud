import type { JSX } from 'react'

import { OBJECT_NAME_HINT } from '@/modules/database/components/object-name'
import {
  COMMAND_OPTIONS,
  type PolicyDraft,
  hasUsing,
  hasWithCheck,
  isPolicyCommand,
} from '@/modules/database/components/policy-draft'
import { PolicyRolePicker } from '@/modules/database/components/policy-role-picker'
import { SelectField } from '@/shared/ui/select-field'
import { TextAreaField, TextField } from '@/shared/ui/text-field'

type PolicyFieldsProps = {
  draft: PolicyDraft
  onChange: (change: Partial<PolicyDraft>) => void
}

/** Name, command, roles and the conditions that apply to the chosen command. */
export function PolicyFields({ draft, onChange }: PolicyFieldsProps): JSX.Element {
  function pickCommand(value: string): void {
    if (isPolicyCommand(value) === false) {
      return
    }

    onChange({ command: value })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Nome"
          required
          spellCheck={false}
          autoComplete="off"
          placeholder="own_rows"
          hint={OBJECT_NAME_HINT}
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <SelectField
          label="Comando"
          options={COMMAND_OPTIONS}
          value={draft.command}
          onValueChange={pickCommand}
        />
      </div>
      <PolicyRolePicker selected={draft.roles} onChange={(roles) => onChange({ roles })} />
      <ConditionField
        isShown={hasUsing(draft.command)}
        label="Linhas que alcança (USING)"
        hint="Condição SQL sobre as linhas existentes, como user_id = auth.uid()."
        value={draft.using}
        onChange={(using) => onChange({ using })}
      />
      <ConditionField
        isShown={hasWithCheck(draft.command)}
        label="Linhas que pode gravar (WITH CHECK)"
        hint="Condição SQL sobre as linhas inseridas ou alteradas."
        value={draft.withCheck}
        onChange={(withCheck) => onChange({ withCheck })}
      />
    </div>
  )
}

type ConditionFieldProps = {
  isShown: boolean
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
}

function ConditionField(props: ConditionFieldProps): JSX.Element | null {
  if (props.isShown === false) {
    return null
  }

  return (
    <TextAreaField
      label={props.label}
      hint={props.hint}
      rows={2}
      isCode
      spellCheck={false}
      autoCapitalize="none"
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}
