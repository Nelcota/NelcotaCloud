import type { JSX } from 'react'

import type { DeliveryFilter } from '@/modules/webhooks/components/delivery-filter'
import { DeliveryLog } from '@/modules/webhooks/components/delivery-log'
import { EndpointEventsTab } from '@/modules/webhooks/components/endpoint-events-tab'
import type { EndpointPanel } from '@/modules/webhooks/components/endpoint-panel-types'
import { EndpointSecretTab } from '@/modules/webhooks/components/endpoint-secret-tab'
import { EndpointSettingsTab } from '@/modules/webhooks/components/endpoint-settings-tab'
import { WebhookTabPanel } from '@/modules/webhooks/components/webhook-tab-panel'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

export type EndpointTab = 'deliveries' | 'events' | 'secret' | 'settings'

const TABS: readonly { value: EndpointTab; label: string }[] = [
  { value: 'deliveries', label: 'Entregas' },
  { value: 'events', label: 'Eventos' },
  { value: 'secret', label: 'Segredo' },
  { value: 'settings', label: 'Configurações' },
]

export type EndpointTabsView = {
  tab: EndpointTab
  filter: DeliveryFilter
  onTabChange: (tab: EndpointTab) => void
  onFilterChange: (filter: DeliveryFilter) => void
}

type EndpointTabsProps = { panel: EndpointPanel; view: EndpointTabsView }

/** Deliveries first; events, the secret with its verification code and settings behind a tab. */
export function EndpointTabs({ panel, view }: EndpointTabsProps): JSX.Element {
  return (
    <Tabs
      value={view.tab}
      onValueChange={(value) => view.onTabChange(tabOf(value))}
      className="gap-0"
    >
      <div className="border-b px-4 sm:px-6">
        <TabsList variant="line" className="justify-start gap-2.5 px-0 sm:gap-5">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-none px-0">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <WebhookTabPanel value="deliveries">
        <DeliveryLog
          projectId={panel.projectId}
          endpointId={panel.endpoint.id}
          filter={{ value: view.filter, onChange: view.onFilterChange }}
        />
      </WebhookTabPanel>
      <WebhookTabPanel value="events" className="p-5 sm:p-6">
        <EndpointEventsTab projectId={panel.projectId} endpoint={panel.endpoint} />
      </WebhookTabPanel>
      <WebhookTabPanel value="secret" className="p-5 sm:p-6">
        <EndpointSecretTab panel={panel} />
      </WebhookTabPanel>
      <WebhookTabPanel value="settings" className="p-5 sm:p-6">
        <EndpointSettingsTab projectId={panel.projectId} endpoint={panel.endpoint} />
      </WebhookTabPanel>
    </Tabs>
  )
}

function tabOf(value: string): EndpointTab {
  return TABS.find((tab) => tab.value === value)?.value ?? 'deliveries'
}
