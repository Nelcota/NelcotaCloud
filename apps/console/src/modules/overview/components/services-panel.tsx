import { ChevronRight } from 'lucide-react'
import type { JSX } from 'react'

import { type Service, useServices } from '@/modules/overview/queries/use-services'
import { RouterLink } from '@/shared/routing/router-link'
import { StatusBadge } from '@/shared/ui/status-badge'

/** Each product of the project, its base path and its live state. */
export function ServicesPanel({ projectId }: { projectId: string }): JSX.Element {
  const services = useServices(projectId)

  return (
    <section
      aria-labelledby="services-title"
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card"
    >
      <h2 id="services-title" className="border-b px-4 py-3.5 text-base font-medium text-heading">
        Serviços
      </h2>
      <ul className="divide-y">
        {services.map((service) => (
          <li key={service.name}>
            <ServiceRow service={service} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function ServiceRow({ service }: { service: Service }): JSX.Element {
  return (
    <RouterLink
      href={service.to}
      className="group flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface"
    >
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate text-sm font-medium text-heading">{service.name}</span>
        <code title={service.path} className="truncate font-mono text-xs text-muted-foreground">
          {service.path}
        </code>
      </span>
      <StatusBadge tone={service.status.tone}>{service.status.label}</StatusBadge>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
      />
    </RouterLink>
  )
}
