import type { JSX } from 'react'

import { ApiHealthCard } from '@/modules/system-status/components/api-health-card'

export function DashboardPage(): JSX.Element {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Console</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie projetos, usuários e provedores de login da sua conta NelcotaCloud.
        </p>
      </div>
      <ApiHealthCard />
    </section>
  )
}
