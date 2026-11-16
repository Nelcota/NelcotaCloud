import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useCreateProjectMutation } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { SwitchField } from '@/shared/ui/switch-field'

type CreatedProject = components['schemas']['CreatedTenantResponse']

export function NewProjectForm({
  onCreated,
}: {
  onCreated: (project: CreatedProject) => void
}): JSX.Element {
  const creation = useCreateProjectMutation()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [siteUrl, setSiteUrl] = useState('')
  const [requiresVerification, setRequiresVerification] = useState(true)

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const body = { name, slug, site_url: siteUrl, require_email_verification: requiresVerification }
    creation.mutate(body, { onSuccess: onCreated })
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormField
        label="Nome"
        required
        maxLength={100}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <FormField
        label="Identificador (slug)"
        required
        pattern="[a-z][a-z0-9_]{2,39}"
        hint="3 a 40 letras minúsculas, números ou _, começando por letra. Não muda depois."
        value={slug}
        onChange={(event) => setSlug(event.target.value)}
      />
      <FormField
        label="URL do seu app"
        type="url"
        required
        placeholder="https://app.exemplo.com"
        hint="Links de email abrem aqui e o OAuth só volta para endereços abaixo dela."
        value={siteUrl}
        onChange={(event) => setSiteUrl(event.target.value)}
      />
      <SwitchField
        label="Exigir confirmação de email para login com senha"
        checked={requiresVerification}
        onCheckedChange={setRequiresVerification}
      />
      <ErrorAlert error={creation.error} />
      <Button type="submit" disabled={creation.isPending} aria-busy={creation.isPending}>
        Criar projeto
      </Button>
    </form>
  )
}
