import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useCreateProjectMutation } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { SettingsSection } from '@/shared/ui/settings-section'
import { SwitchField } from '@/shared/ui/switch-field'

type CreatedProject = components['schemas']['CreatedTenantResponse']

const MAX_SLUG_LENGTH = 40
const DIACRITICS = /[̀-ͯ]/g
const NOT_SLUG_CHARACTERS = /[^a-z0-9]+/g
const LEADING_NON_LETTERS = /^[^a-z]+/
const EDGE_UNDERSCORES = /^_+|_+$/g

export function NewProjectForm({
  onCreated,
}: {
  onCreated: (project: CreatedProject) => void
}): JSX.Element {
  const creation = useCreateProjectMutation()
  const [name, setName] = useState('')
  const [customSlug, setCustomSlug] = useState<string | null>(null)
  const [siteUrl, setSiteUrl] = useState('')
  const [requiresVerification, setRequiresVerification] = useState(true)
  const slug = customSlug ?? slugFromName(name)

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const body = { name, slug, site_url: siteUrl, require_email_verification: requiresVerification }
    creation.mutate(body, { onSuccess: onCreated })
  }

  return (
    <form onSubmit={submit}>
      <SettingsSection
        title="Detalhes do projeto"
        footer={
          <Button type="submit" disabled={creation.isPending} aria-busy={creation.isPending}>
            Criar projeto
          </Button>
        }
      >
        <FormField
          label="Nome"
          required
          autoFocus
          maxLength={100}
          placeholder="Acme Store"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <FormField
          label="Identificador (slug)"
          required
          pattern="[a-z][a-z0-9_]{2,39}"
          className="font-mono"
          hint="Sugerido a partir do nome. 3 a 40 letras minúsculas, números ou _, começando por letra. Não muda depois."
          value={slug}
          onChange={(event) => setCustomSlug(event.target.value)}
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
          label="Exigir email confirmado"
          description="Login com senha só para quem confirmou o email. Dá para mudar depois."
          checked={requiresVerification}
          onCheckedChange={setRequiresVerification}
        />
        <ErrorAlert error={creation.error} />
      </SettingsSection>
    </form>
  )
}

/** "Loja da Ana 2" → "loja_da_ana_2": the slug rules, applied to whatever the name is. */
function slugFromName(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(NOT_SLUG_CHARACTERS, '_')
    .replace(LEADING_NON_LETTERS, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(EDGE_UNDERSCORES, '')
}
