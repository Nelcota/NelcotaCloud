import type { JSX } from 'react'

import { type PolicyRole, ROLE_OPTIONS } from '@/modules/database/components/policy-draft'
import { FieldLegend, FieldSet } from '@/shared/ui/primitives/field'
import { CheckboxField } from '@/shared/ui/switch-field'

type PolicyRolePickerProps = {
  selected: readonly PolicyRole[]
  onChange: (roles: PolicyRole[]) => void
}

/** Who the policy applies to: requests with only the publishable key, logged-in users, or both. */
export function PolicyRolePicker({ selected, onChange }: PolicyRolePickerProps): JSX.Element {
  function toggle(role: PolicyRole, isChecked: boolean): void {
    const roles = ROLE_OPTIONS.map((option) => option.value).filter((candidate) => {
      if (candidate === role) {
        return isChecked
      }

      return selected.includes(candidate)
    })

    onChange(roles)
  }

  return (
    <FieldSet className="gap-2.5">
      <FieldLegend variant="label" className="mb-0">
        Para quem
      </FieldLegend>
      {ROLE_OPTIONS.map((option) => (
        <CheckboxField
          key={option.value}
          label={option.label}
          checked={selected.includes(option.value)}
          onCheckedChange={(isChecked) => toggle(option.value, isChecked)}
        />
      ))}
    </FieldSet>
  )
}
