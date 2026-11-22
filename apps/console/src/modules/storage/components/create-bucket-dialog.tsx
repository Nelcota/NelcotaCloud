import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useCreateBucket } from '@/modules/storage/queries/use-storage-bucket-mutations'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog'
import { TextField } from '@/shared/ui/text-field'

/** What the API accepts: lowercase letters, digits and inner hyphens, up to 63 characters. */
const BUCKET_NAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/

type CreateBucketDialogProps = {
  projectId: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onCreated: (bucketId: string) => void
}

export function CreateBucketDialog(props: CreateBucketDialogProps): JSX.Element {
  const [name, setName] = useState('')
  const creation = useCreateBucket(props.projectId)

  function changeOpen(isOpen: boolean): void {
    if (creation.isPending) {
      return
    }

    setName('')
    creation.reset()
    props.onOpenChange(isOpen)
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (BUCKET_NAME.test(name) === false) {
      return
    }

    creation.mutate(name, { onSuccess: (bucket) => props.onCreated(bucket.id) })
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={changeOpen}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <form onSubmit={submit} className="flex flex-col gap-5">
          <DialogHeader className="pe-8">
            <DialogTitle>Novo bucket</DialogTitle>
            <DialogDescription>Os arquivos de um bucket são privados do projeto.</DialogDescription>
          </DialogHeader>
          <TextField
            label="Nome do bucket"
            hint="Letras minúsculas, números e hífens entre caracteres."
            required
            autoFocus
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            className="[&_input]:font-mono"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <ErrorAlert error={creation.error} />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={creation.isPending}
              onClick={() => changeOpen(false)}
            >
              Cancelar
            </Button>
            <PendingButton
              type="submit"
              isPending={creation.isPending}
              disabled={BUCKET_NAME.test(name) === false}
            >
              Criar bucket
            </PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
