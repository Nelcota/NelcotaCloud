import type { JSX } from 'react'
import { useState } from 'react'

import { useCreateBucket } from '@/modules/storage/queries/use-storage-bucket-mutations'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { TextField } from '@/shared/ui/text-field'

/** What the API accepts: lowercase letters, digits and inner hyphens, up to 63 characters. */
const BUCKET_NAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/
const BUCKET_NAME_MAX_LENGTH = 63

type CreateBucketDialogProps = {
  projectId: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onCreated: (bucketId: string) => void
}

export function CreateBucketDialog(props: CreateBucketDialogProps): JSX.Element {
  const [name, setName] = useState('')
  const [wasOpen, setWasOpen] = useState(props.isOpen)
  const creation = useCreateBucket(props.projectId)

  // Each opening starts empty: a name typed and cancelled last time never comes back.
  if (props.isOpen !== wasOpen) {
    setWasOpen(props.isOpen)
  }

  if (props.isOpen && wasOpen === false) {
    setName('')
  }

  async function create(): Promise<void> {
    const bucket = await creation.mutateAsync(name)
    props.onCreated(bucket.id)
  }

  return (
    <ConfirmDialog
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      title="Novo bucket"
      description="Os arquivos de um bucket são privados do projeto."
      confirmLabel="Criar bucket"
      missing={nameMissing(name)}
      onConfirm={create}
    >
      <TextField
        label="Nome do bucket"
        hint="Letras minúsculas, números e hífens entre caracteres."
        required
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="none"
        maxLength={BUCKET_NAME_MAX_LENGTH}
        className="[&_input]:font-mono"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
    </ConfirmDialog>
  )
}

function nameMissing(name: string): string | null {
  if (name === '') {
    return 'Dê um nome ao bucket'
  }

  if (BUCKET_NAME.test(name) === false) {
    return 'Use só letras minúsculas, números e hífens'
  }

  return null
}
