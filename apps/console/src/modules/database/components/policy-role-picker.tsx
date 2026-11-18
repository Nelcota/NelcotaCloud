import type { JSX } from 'react'

import { type PolicyRole, ROLE_OPTIONS } from '@/modules/database/components/policy-draft'
import { CheckField } from '@/shared/ui/check-field'

type PolicyRolePickerProps = {
  selected: readonly PolicyRole[]
  onChange: (roles: PolicyRole[]) => void
}

/** Who the policy applies to: requests with only the publishable key, logged-in users, or both. */
export function PolicyRolePicker({ selected, onChange }: PolicyRolePickerProps): JSX.Element {
  function toggle(role: PolicyRole, isChecked: boolean): void {
    const others = selected.filter((current) => current !== role)

    if (isChecked) {
      onChange([...others, role])
      return
    }

    onChange(others)
  }

  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">Para quem</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {ROLE_OPTIONS.map((option) => (
          <CheckField
            key={option.value}
            label={option.label}
            isChecked={selected.includes(option.value)}
            onChange={(isChecked) => toggle(option.value, isChecked)}
          />
        ))}
      </div>
    </fieldset>
  )
}
