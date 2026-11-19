import type { JSX, SubmitEvent } from 'react'
import { useState } from 'react'

import { BlockedAddressList } from '@/modules/project-settings/ip-blocks/components/blocked-address-list'
import { useBlockAddressMutation } from '@/modules/project-settings/ip-blocks/queries/use-blocked-addresses'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { SelectField } from '@/shared/ui/select-field'
import { SettingsSection } from '@/shared/ui/settings-section'

/** How long a block lasts, in hours; empty blocks until removed. */
const DURATIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'Até desbloquear' },
  { value: '1', label: '1 hora' },
  { value: '24', label: '24 horas' },
  { value: '168', label: '7 dias' },
  { value: '720', label: '30 dias' },
]

/** Addresses refused by login, signup and emailed links, and the form to add one. */
export function BlockedAddressesSection({ projectId }: { projectId: string }): JSX.Element {
  const block = useBlockAddressMutation(projectId)
  const [address, setAddress] = useState('')
  const [note, setNote] = useState('')
  const [hours, setHours] = useState('')

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    block.mutate(
      { address: address.trim(), note: textOrNull(note), expires_in_hours: hoursOrNull(hours) },
      { onSuccess: () => clear() },
    )
  }

  function clear(): void {
    setAddress('')
    setNote('')
    setHours('')
  }

  return (
    <form onSubmit={submit}>
      <SettingsSection
        title="IPs bloqueados"
        description="Logins, cadastros e links por e-mail vindos destes endereços são recusados."
        footer={
          <Button type="submit" disabled={block.isPending} aria-busy={block.isPending}>
            Bloquear
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <FormField
            label="IP ou faixa"
            hint="Um endereço (203.0.113.7) ou uma faixa até /16 (203.0.113.0/24)."
            required
            maxLength={64}
            autoComplete="off"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <SelectField
            label="Duração"
            value={hours}
            onChange={(event) => setHours(event.target.value)}
          >
            {DURATIONS.map((duration) => (
              <option key={duration.value} value={duration.value}>
                {duration.label}
              </option>
            ))}
          </SelectField>
        </div>
        <FormField
          label="Motivo"
          maxLength={200}
          autoComplete="off"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <ErrorAlert error={block.error} />
        <BlockedAddressList projectId={projectId} />
      </SettingsSection>
    </form>
  )
}

function textOrNull(text: string): string | null {
  const trimmed = text.trim()

  if (trimmed === '') {
    return null
  }

  return trimmed
}

function hoursOrNull(text: string): number | null {
  const hours = Number.parseInt(text, 10)

  if (Number.isFinite(hours) === false) {
    return null
  }

  return hours
}
