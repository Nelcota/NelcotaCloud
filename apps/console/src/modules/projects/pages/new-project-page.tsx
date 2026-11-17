import { Link } from '@tanstack/react-router'
import ArrowLeft from '~icons/solar/arrow-left-linear'
import CircleCheck from '~icons/solar/check-circle-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { ConnectAppPanel } from '@/modules/api-keys/components/connect-app-panel'
import { SecretLeaveGuard } from '@/modules/api-keys/components/secret-leave-guard'
import { CopyableValue } from '@/shared/ui/copyable-value'
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
        <ArrowLeft className="size-5" />
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
        <CircleCheck className="mt-1 size-6 shrink-0 text-emerald-500" />
        <PageHeader
          title="Projeto criado"
          description="Guarde a secret key agora: ela não aparece de novo. A publishable vai no app e continua visível em Chaves de API; a secret fica só no seu servidor."
        />
      </div>
      <SecretLeaveGuard isActive subject="Secret key nova" />
      <SettingsSection
        title="Chaves de API"
        footer={
          <Link
            to="/projects/$projectId"
            params={{ projectId: created.tenant_id }}
            ignoreBlocker
            className={buttonVariants()}
          >
            Já guardei a secret key, abrir o projeto
          </Link>
        }
      >
        <CopyableValue label="Publishable key" value={created.publishable_key} autoFocusCopy />
        <CopyableValue label="Secret key" value={created.secret_key} />
      </SettingsSection>
      <ConnectAppPanel publishableKey={created.publishable_key} projectId={created.tenant_id} />
    </>
  )
}
