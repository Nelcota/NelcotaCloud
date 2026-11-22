import type { JSX } from 'react'
import { useState } from 'react'

import { ActivityFeed } from '@/modules/activity/components/activity-feed'
import type { UserActionRunner } from '@/modules/users/components/user-action-runner'
import { UserMetadataPreview } from '@/modules/users/components/user-metadata-preview'
import { UserMetadataSection } from '@/modules/users/components/user-metadata-section'
import { UserProperties } from '@/modules/users/components/user-properties'
import { UserSessionsSection } from '@/modules/users/components/user-sessions-section'
import { UserTabPanel } from '@/modules/users/components/user-tab-panel'
import type { components } from '@/shared/api/api-schema'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

type User = components['schemas']['User']

type UserDetailTabsProps = { projectId: string; user: User; runner: UserActionRunner }

const TABS = [
  { value: 'overview', label: 'Visão geral' },
  { value: 'sessions', label: 'Sessões' },
  { value: 'metadata', label: 'Metadados' },
  { value: 'activity', label: 'Atividade' },
] as const

/** The user's page below the header: overview, sessions, metadata and activity. */
export function UserDetailTabs({ projectId, user, runner }: UserDetailTabsProps): JSX.Element {
  const [tab, setTab] = useState('overview')

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <TabsList variant="line" className="w-full justify-start gap-4 border-b px-0">
        {TABS.map((item) => (
          <TabsTrigger key={item.value} value={item.value} className="flex-none px-0">
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <UserTabPanel value="overview">
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UserProperties projectId={projectId} user={user} />
          </div>
          <UserMetadataPreview user={user} onEdit={() => setTab('metadata')} />
        </div>
      </UserTabPanel>
      <UserTabPanel value="sessions">
        <UserSessionsSection projectId={projectId} user={user} runner={runner} />
      </UserTabPanel>
      <UserTabPanel value="metadata">
        <UserMetadataSection key={user.id} projectId={projectId} user={user} />
      </UserTabPanel>
      <UserTabPanel value="activity">
        <ActivityFeed projectId={projectId} userId={user.id} />
      </UserTabPanel>
    </Tabs>
  )
}
