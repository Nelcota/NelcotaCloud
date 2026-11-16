import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useState } from 'react'

import { SecretReveal } from '@/modules/api-keys/components/secret-reveal'
import { NewProjectForm } from '@/modules/projects/components/new-project-form'
import type { components } from '@/shared/api/api-schema'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { buttonVariants } from '@/shared/ui/button-variants'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

type CreatedProject = components['schemas']['CreatedTenantResponse']

export function NewProjectPage(): JSX.Element {
  const [created, setCreated] = useState<CreatedProject | null>(null)

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Novo projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <NewProjectContent created={created} onCreated={setCreated} />
        </CardContent>
      </Card>
    </div>
  )
}

type NewProjectContentProps = {
  created: CreatedProject | null
  onCreated: (project: CreatedProject) => void
}

function NewProjectContent({ created, onCreated }: NewProjectContentProps): JSX.Element {
  if (created === null) {
    return <NewProjectForm onCreated={onCreated} />
  }

  return (
    <div className="grid gap-4">
      <Alert>
        <AlertDescription>
          Guarde as chaves agora: elas não são mostradas de novo. A publishable vai no app; a secret
          fica só no seu servidor.
        </AlertDescription>
      </Alert>
      <SecretReveal label="Publishable key" value={created.publishable_key} />
      <SecretReveal label="Secret key" value={created.secret_key} />
      <Link
        to="/projects/$projectId"
        params={{ projectId: created.tenant_id }}
        className={buttonVariants()}
      >
        Abrir o projeto
      </Link>
    </div>
  )
}
