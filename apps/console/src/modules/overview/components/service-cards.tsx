import type { JSX } from 'react'

import { type Service, useServices } from '@/modules/overview/queries/use-services'
import { ResourceCard } from '@/shared/ui/resource-card'
import { StatusBadge } from '@/shared/ui/status-badge'

/** Each product of the project as a card: what it is, where it answers and its live state. */
export function ServiceCards({ projectId }: { projectId: string }): JSX.Element {
  const services = useServices(projectId)

  return (
    <section aria-labelledby="services-title" className="grid gap-3">
      <h2 id="services-title" className="text-base font-medium text-heading">
        Serviços
      </h2>
      <div className="grid gap-3 @min-[36rem]:grid-cols-2 @min-[56rem]:grid-cols-5">
        {services.map((service) => (
          <ServiceCard key={service.name} service={service} />
        ))}
      </div>
    </section>
  )
}

function ServiceCard({ service }: { service: Service }): JSX.Element {
  const Glyph = service.icon

  return (
    <ResourceCard
      name={service.name}
      href={service.to}
      kind={service.kind}
      leading={
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-hover">
          <Glyph aria-hidden className="size-4.5 text-muted-foreground" />
        </span>
      }
      address={service.path}
      status={<StatusBadge tone={service.status.tone}>{service.status.label}</StatusBadge>}
    />
  )
}
