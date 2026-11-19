import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ActivityFeed } from '@/modules/activity/components/activity-feed'
import { RecentActivity } from '@/modules/activity/components/recent-activity'
import type { UserActivityProps } from '@/modules/users/components/user-tabs'
import { UserDetail } from '@/modules/users/components/user-detail'
import { type UserTab, searchForUserTab, userTabOf } from '@/modules/users/model/user-detail-search'
import { buttonVariants } from '@/shared/ui/button-variants'

const ROUTE_ID = '/_authenticated/projects/$projectId/users/$userId'
const ROUTE_PATH = '/projects/$projectId/users/$userId'

const ACTIVITY_VIEWS = { Full: UserFullActivity, Recent: UserRecentActivity }

/** Composes the user's page with the activity module's views; the open tab lives in the URL. */
export function UserDetailPage(): JSX.Element {
  const { projectId, userId } = useParams({ from: ROUTE_ID })
  const tab = userTabOf(useSearch({ from: ROUTE_ID }))
  const navigate = useNavigate({ from: ROUTE_PATH })

  // Each tab is a step of the Back button, so Back returns to the tab before.
  function changeTab(next: UserTab): void {
    void navigate({ search: searchForUserTab(next) })
  }

  return (
    <UserDetail
      projectId={projectId}
      userId={userId}
      view={{ tab, onTabChange: changeTab }}
      activity={ACTIVITY_VIEWS}
    />
  )
}

function UserFullActivity({ projectId, userId }: UserActivityProps): JSX.Element {
  return <ActivityFeed projectId={projectId} userId={userId} />
}

function UserRecentActivity({ projectId, userId, onSeeAll }: UserActivityProps): JSX.Element {
  return (
    <RecentActivity
      projectId={projectId}
      userId={userId}
      seeAll={
        <button
          type="button"
          onClick={onSeeAll}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          Ver tudo
        </button>
      }
    />
  )
}
