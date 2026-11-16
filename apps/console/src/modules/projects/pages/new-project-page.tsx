import { Link } from '@tanstack/react-router'
import { ArrowLeft, CircleCheck } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { SecretReveal } from '@/modules/api-keys/components/secret-reveal'
import { NewProjectForm } from '@/modules/projects/components/new-project-form'
import type { components } from '@/shared/api/api-schema'
import { buttonVariants } from '@/shared/ui/button-variants'
import { PageHeader } from '@/shared/ui/page-header'
import { SettingsSection } from '@/shared/ui/settings-section'

type CreatedProject = components['schemas']['CreatedTenantResponse']

export function NewProjectPage(): JSX.Element {
  const [created, setCreated] = useState<CreatedProject | null>(null)

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <Link
        to="/"
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 rounded-md text-sm transition-colors"
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Projetos
      </Link>
      <NewProjectContent created={created} onCreated={setCreated} />
    </div>
  )
}

type NewProjectContentProps = {
  created: CreatedProject | null
  onCreated: (project: CreatedProject) => void
}

function NewProjectContent({ created, onCreated }: NewProjectContentProps): JSX.Element {
  if (created === null) {
    return (
      <>
        <PageHeader
          title="Novo projeto"
          description="Um projeto é o Auth de um app, com banco de dados, usuários e chaves só dele."
        />
        <NewProjectForm onCreated={onCreated} />
      </>
    )
  }

  return (
    <>
      <div className="flex items-start gap-3">
        <CircleCheck className="mt-1 size-6 shrink-0 text-emerald-500" strokeWidth={1.75} />
        <PageHeader
          title="Projeto criado"
          description="Guarde as chaves agora: elas não aparecem de novo. A publishable vai no app; a secret fica só no seu servidor."
        />
      </div>
      <SettingsSection
        title="Chaves de API"
        footer={
          <Link
            to="/projects/$projectId"
            params={{ projectId: created.tenant_id }}
            className={buttonVariants()}
          >
            Abrir o projeto
          </Link>
        }
      >
        <SecretReveal label="Publishable key" value={created.publishable_key} />
        <SecretReveal label="Secret key" value={created.secret_key} />
      </SettingsSection>
    </>
  )
}
