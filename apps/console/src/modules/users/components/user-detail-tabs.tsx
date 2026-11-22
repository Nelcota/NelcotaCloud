import type { JSX } from 'react'
import { useState } from 'react'

import { ActivityFeed } from '@/modules/activity/components/activity-feed'
import type { UserActionRunner } from '@/modules/users/components/user-action-runner'
import { UserMetadataSection } from '@/modules/users/components/user-metadata-section'
import { UserOverviewTab } from '@/modules/users/components/user-overview-tab'
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
      <TabsList variant="line" className="w-full">
        {TABS.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <UserTabPanel value="overview">
        <UserOverviewTab
          projectId={projectId}
          user={user}
          runner={runner}
          onEditMetadata={() => setTab('metadata')}
        />
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
