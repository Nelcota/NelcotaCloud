import type { JSX, SubmitEvent } from 'react'
import { useState } from 'react'

import { useCreateCacheCredential } from '@/modules/cache/queries/use-project-cache'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

type CacheCredentialFormProps = { projectId: string; onIssued: (token: string) => void }

export function CacheCredentialForm({
  projectId,
  onIssued,
}: CacheCredentialFormProps): JSX.Element {
  const [name, setName] = useState('')
  const create = useCreateCacheCredential(projectId, (credential) => onIssued(credential.token))

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    const label = name.trim()

    if (label === '' || create.isPending) {
      return
    }

    create.mutate(label)
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:max-w-md">
      <FormField
        label="Nome da credencial"
        value={name}
        maxLength={64}
        required
        autoComplete="off"
        onChange={(event) => setName(event.currentTarget.value)}
      />
      <ErrorAlert error={create.error} />
      <div>
        <Button
          type="submit"
          disabled={name.trim() === '' || create.isPending}
          aria-busy={create.isPending}
        >
          Gerar credencial
        </Button>
      </div>
    </form>
  )
}
