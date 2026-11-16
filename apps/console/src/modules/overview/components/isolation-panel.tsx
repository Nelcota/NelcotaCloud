import Database from '~icons/solar/database-linear'
import KeySquare from '~icons/solar/key-square-2-linear'
import LockKeyhole from '~icons/solar/lock-keyhole-linear'
import type { IconComponent } from '@/shared/ui/icon-component'
import type { JSX } from 'react'

import { useProjectsQuery } from '@/modules/projects/queries/use-projects'
import { Skeleton } from '@/shared/ui/skeleton'

type Readout = {
  icon: IconComponent
  label: string
  value: string
  detail: string
}

/** What keeps this project apart from every other one, stated as facts rather than promises. */
export function IsolationPanel({ projectId }: { projectId: string }): JSX.Element {
  const projects = useProjectsQuery()
  const slug = projects.data?.find((project) => project.id === projectId)?.slug

  return (
    <section aria-labelledby="isolation-title" className="bg-card rounded-xl border">
      <header className="border-b px-5 py-4">
        <h2 id="isolation-title">Isolamento do projeto</h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Nada deste projeto é compartilhado com outros: dados, segredos e chaves são só dele.
        </p>
      </header>
      <dl className="grid divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {readouts(slug).map((readout) => (
          <ReadoutItem key={readout.label} readout={readout} />
        ))}
      </dl>
    </section>
  )
}

function readouts(slug: string | undefined): Readout[] {
  return [
    {
      icon: Database,
      label: 'Banco de dados',
      value: databaseName(slug),
      detail: 'Um Postgres só para os usuários e sessões deste projeto.',
    },
    {
      icon: LockKeyhole,
      label: 'Segredos',
      value: 'AES-GCM',
      detail: 'Chaves de assinatura, OAuth, SMTP e MFA cifrados, cada um preso ao seu projeto.',
    },
    {
      icon: KeySquare,
      label: 'Tokens',
      value: 'EdDSA',
      detail: 'Assinados por uma chave própria do projeto, publicada no JWKS.',
    },
  ]
}

function databaseName(slug: string | undefined): string {
  if (slug === undefined) {
    return ''
  }

  return `tenant_${slug}`
}

function ReadoutItem({ readout }: { readout: Readout }): JSX.Element {
  const Icon = readout.icon

  return (
    <div className="grid content-start gap-1 px-5 py-4">
      <dt className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
        <Icon aria-hidden="true" className="size-4" />
        {readout.label}
      </dt>
      <dd className="grid gap-1">
        <ReadoutValue value={readout.value} />
        <span className="text-muted-foreground text-xs text-pretty">{readout.detail}</span>
      </dd>
    </div>
  )
}

function ReadoutValue({ value }: { value: string }): JSX.Element {
  if (value === '') {
    return <Skeleton className="h-5 w-32" />
  }

  return <span className="truncate font-mono text-sm">{value}</span>
}
