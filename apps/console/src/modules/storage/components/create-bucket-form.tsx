import type { FormEvent, JSX } from 'react'

import { useCreateBucket } from '@/modules/storage/queries/use-storage-buckets'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

type CreateBucketFormProps = {
  projectId: string
  onCreated: (bucketId: string) => void
  onCancel: () => void
}

export function CreateBucketForm({
  projectId,
  onCreated,
  onCancel,
}: CreateBucketFormProps): JSX.Element {
  const creation = useCreateBucket(projectId)

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const name = new FormData(event.currentTarget).get('bucket-name')

    if (typeof name === 'string') {
      creation.mutate(name, { onSuccess: (bucket) => onCreated(bucket.id) })
    }
  }

  return (
    <form
      aria-label="Criar bucket"
      method="post"
      onSubmit={submit}
      className="bg-card grid gap-3 rounded-xl border p-4"
    >
      <FormField
        label="Nome do bucket"
        name="bucket-name"
        maxLength={63}
        pattern="[a-z0-9](?:[a-z0-9\x2D]{0,61}[a-z0-9])?"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        hint="Use letras minúsculas, números e hífens entre caracteres."
        required
      />
      <ErrorAlert error={creation.error} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={creation.isPending} aria-busy={creation.isPending}>
          Criar bucket
        </Button>
        <Button type="button" variant="outline" disabled={creation.isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
