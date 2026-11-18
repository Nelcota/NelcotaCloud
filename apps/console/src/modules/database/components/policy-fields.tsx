import type { JSX } from 'react'

import {
  COMMAND_OPTIONS,
  type PolicyDraft,
  hasUsing,
  hasWithCheck,
  isPolicyCommand,
} from '@/modules/database/components/policy-draft'
import { PolicyRolePicker } from '@/modules/database/components/policy-role-picker'
import { OBJECT_NAME_HINT } from '@/modules/database/components/object-name'
import { FormField } from '@/shared/ui/form-field'
import { SelectField } from '@/shared/ui/select-field'
import { TextAreaField } from '@/shared/ui/text-area-field'

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
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          label="Nome"
          required
          spellCheck={false}
          autoComplete="off"
          placeholder="own_rows"
          hint={OBJECT_NAME_HINT}
          className="font-mono"
          value={draft.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        <SelectField
          label="Comando"
          value={draft.command}
          onChange={(event) => pickCommand(event.target.value)}
        >
          {COMMAND_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
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
      spellCheck={false}
      className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 w-full resize-y rounded-lg border bg-transparent px-3 py-2 font-mono text-sm outline-none focus-visible:ring-3"
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )
}
