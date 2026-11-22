import type { JSX } from 'react'

import { SETTINGS_TABS } from '@/modules/project-settings/components/settings-tabs'
import { TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

export function SettingsTabList(): JSX.Element {
  return (
    <TabsList variant="line" aria-label="Seções das configurações" className="w-full">
      {SETTINGS_TABS.map((tab) => (
        <TabsTrigger key={tab.id} value={tab.id}>
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
