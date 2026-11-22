import { ArrowRight } from 'lucide-react'
import { type JSX, useEffect, useRef, useState } from 'react'

import { SecretLeaveGuard } from '@/modules/api-keys/components/secret-leave-guard'
import type { CreatedSetup } from '@/modules/projects/components/created-setup'
import { NextSteps } from '@/modules/projects/components/next-steps'
import { ProjectCredentials } from '@/modules/projects/components/project-credentials'
import { SdkSnippet } from '@/modules/projects/components/sdk-snippet'
import { SecretKeyPanel } from '@/modules/projects/components/secret-key-panel'
import { RouterLink } from '@/shared/routing/router-link'
import { Button } from '@/shared/ui/primitives/button'
import { Section } from '@/shared/ui/section'

/** The created project: the secret key shown once, its public values, the SDK and what's next. */
export function ProjectReady({ setup }: { setup: CreatedSetup }): JSX.Element {
  const { project, purpose, name } = setup
  const [isSecretSaved, setIsSecretSaved] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <div className="grid min-w-0 gap-8">
      <SecretLeaveGuard isActive={isSecretSaved === false} subject="Chave secreta do projeto" />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <h2
            ref={heading}
            tabIndex={-1}
            className="text-3xl font-semibold tracking-tight text-balance text-heading outline-none"
          >
            Seu projeto está pronto
          </h2>
          <p className="truncate text-base text-muted-foreground">
            {name} · <span className="font-mono text-sm">{project.slug}</span>
          </p>
        </div>
        <Button asChild size="lg">
          <RouterLink href={`/projects/${project.tenant_id}`}>
            Ir para o projeto
            <ArrowRight aria-hidden data-icon="inline-end" />
          </RouterLink>
        </Button>
      </header>
      <SecretKeyPanel
        secretKey={project.secret_key}
        isSaved={isSecretSaved}
        onSavedChange={setIsSecretSaved}
      />
      <div className="@container">
        <div className="grid items-start gap-8 @min-[46rem]:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="grid min-w-0 gap-8">
            <Section title="Valores públicos">
              <ProjectCredentials
                projectId={project.tenant_id}
                publishableKey={project.publishable_key}
              />
            </Section>
            <Section title="SDK">
              <SdkSnippet publishableKey={project.publishable_key} />
            </Section>
          </div>
          <Section title="E agora?" isFramed>
            <NextSteps projectId={project.tenant_id} purpose={purpose} />
          </Section>
        </div>
      </div>
    </div>
  )
}
