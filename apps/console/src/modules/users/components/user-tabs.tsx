import type { ComponentType, JSX } from 'react'
import { useState } from 'react'

import type { UserActionProps } from '@/modules/users/components/user-action-props'
import { UserDangerZone } from '@/modules/users/components/user-danger-zone'
import { UserFactsPanel } from '@/modules/users/components/user-facts-panel'
import { UserMetadataSection } from '@/modules/users/components/user-metadata-section'
import { UserSessionsSection } from '@/modules/users/components/user-sessions-section'
import { type UserTab, userTabFromId } from '@/modules/users/model/user-detail-search'
import { useUserSessionsQuery } from '@/modules/users/queries/use-user-detail'
import { Tab, TabList, TabPanel, Tabs } from '@/shared/ui/tabs'

export type UserActivityProps = { projectId: string; userId: string; onSeeAll: () => void }

/** The activity views the page shows; they come from the activity module through the app. */
export type UserActivityViews = {
  /** The user's whole log, for its tab. */
  Full: ComponentType<UserActivityProps>
  /** The latest few events, with a "Ver tudo" that opens the activity tab. */
  Recent: ComponentType<UserActivityProps>
}

export type UserTabsProps = UserActionProps & {
  projectId: string
  tab: UserTab
  onTabChange: (tab: UserTab) => void
  activity: UserActivityViews
}

/**
 * The user's page below its header, split in tabs so each part is short: an overview (account
 * details and recent activity side by side, then the danger zone), then activity, sessions and
 * metadata on their own.
 */
export function UserTabs(props: UserTabsProps): JSX.Element {
  const { projectId, user, tab, onTabChange, activity } = props
  const sessions = useUserSessionsQuery({ projectId, userId: user.id }).data
  // Lifted, so the Metadados tab can show a draft is waiting while another tab is open.
  const [hasMetadataEdits, setHasMetadataEdits] = useState(false)
  const activityProps = { projectId, userId: user.id, onSeeAll: () => onTabChange('activity') }

  return (
    <Tabs value={tab} onChange={(value) => onTabChange(userTabFromId(value))}>
      <TabList label="Partes do usuário">
        <Tab value="overview">Visão geral</Tab>
        <Tab value="activity">Atividade</Tab>
        <Tab value="sessions" count={sessions?.sessions.length}>
          Sessões
        </Tab>
        <Tab value="metadata" isMarked={hasMetadataEdits}>
          Metadados
        </Tab>
      </TabList>
      <TabPanel value="overview">
        <div className="grid gap-10">
          <div className="grid items-start gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <UserFactsPanel {...props} />
            <activity.Recent {...activityProps} />
          </div>
          <UserDangerZone {...props} />
        </div>
      </TabPanel>
      <TabPanel value="activity">
        <activity.Full {...activityProps} />
      </TabPanel>
      <TabPanel value="sessions">
        <UserSessionsSection projectId={projectId} userId={user.id} />
      </TabPanel>
      <TabPanel value="metadata" keepsDraft>
        <UserMetadataSection
          key={user.id}
          projectId={projectId}
          user={user}
          onEditsChange={setHasMetadataEdits}
        />
      </TabPanel>
    </Tabs>
  )
}
