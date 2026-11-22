import type { JSX } from 'react'
import { useState } from 'react'

import { useBlockAddressMutation } from '@/modules/activity/queries/use-blocked-addresses'
import { showFlash } from '@/shared/lib/flash-notice'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { SelectField } from '@/shared/ui/select-field'
import { TextField } from '@/shared/ui/text-field'

const DURATION_OPTIONS = [
  { label: '1 hora', value: '1' },
  { label: '24 horas', value: '24' },
  { label: '7 dias', value: '168' },
  { label: 'Até remover', value: 'forever' },
]

const DURATION_HOURS: Record<string, number | undefined> = { 1: 1, 24: 24, 168: 168 }

/** The API's limit for a note. */
const NOTE_MAX_LENGTH = 200

type BlockAddressDialogProps = {
  projectId: string
  /** The address to block; `null` keeps the dialog closed. */
  address: string | null
  onClose: () => void
}

/** Asks before blocking an address, with how long and why. */
export function BlockAddressDialog(props: BlockAddressDialogProps): JSX.Element | null {
  if (props.address === null) {
    return null
  }

  return <BlockForm key={props.address} {...props} address={props.address} />
}

type BlockFormProps = Omit<BlockAddressDialogProps, 'address'> & { address: string }

function BlockForm({ projectId, address, onClose }: BlockFormProps): JSX.Element {
  const block = useBlockAddressMutation(projectId)
  const [duration, setDuration] = useState('24')
  const [note, setNote] = useState('')

  async function confirm(): Promise<void> {
    const trimmedNote = note.trim()
    await block.mutateAsync({
      address,
      expires_in_hours: DURATION_HOURS[duration],
      note: trimmedNote || undefined,
    })
    showFlash(`${address} bloqueado.`)
  }

  return (
    <ConfirmDialog
      isOpen
      onClose={onClose}
      title={`Bloquear ${address}?`}
      description="Logins, cadastros e links por email vindos deste endereço serão recusados."
      confirmLabel="Bloquear"
      isDestructive
      onConfirm={confirm}
    >
      <SelectField
        label="Duração"
        options={DURATION_OPTIONS}
        value={duration}
        onValueChange={setDuration}
      />
      <TextField
        label="Nota"
        isOptional
        value={note}
        maxLength={NOTE_MAX_LENGTH}
        onChange={(event) => setNote(event.target.value)}
      />
    </ConfirmDialog>
  )
}
