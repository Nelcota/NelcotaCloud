import type { JSX } from 'react'
import { useState } from 'react'

import { InvitationsSection } from '@/modules/team/components/invitations-section'
import { LeaveProjectSection } from '@/modules/team/components/leave-project-section'
import { MembersSection } from '@/modules/team/components/members-section'
import { RolesPanel } from '@/modules/team/components/roles-panel'
import { invitationRows, matchesSearch, memberRows } from '@/modules/team/components/team-rows'
import { useTeamActions } from '@/modules/team/components/use-team-actions'
import type { components } from '@/shared/api/api-schema'
import { useCurrentAccount } from '@/shared/auth/use-current-account'

type TeamView = components['schemas']['TeamView']

type TeamBrowserProps = { projectId: string; team: TeamView }

/** Who has access, who is invited and the way out, with the roles compared beside them. */
export function TeamBrowser({ projectId, team }: TeamBrowserProps): JSX.Element {
  const [search, setSearch] = useState('')
  const actions = useTeamActions(projectId)
  const me = useCurrentAccount()
  const allMembers = memberRows(team)
  const members = allMembers.filter((row) => matchesSearch(row.email, search))
  const invitations = invitationRows(team).filter((row) => matchesSearch(row.email, search))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          <MembersSection
            team={team}
            rows={members}
            me={me}
            search={{ value: search, onChange: setSearch }}
            onAction={actions.runMember}
          />
          <InvitationsSection
            rows={invitations}
            canManage={team.can_manage}
            onCancel={actions.cancelInvitation}
            onResend={actions.resendInvitation}
          />
        </div>
        <div className="lg:sticky lg:top-6">
          <RolesPanel />
        </div>
      </div>
      <LeaveProjectSection
        team={team}
        ownRow={allMembers.find((row) => row.id === me.id) ?? null}
        onAction={actions.runMember}
      />
    </div>
  )
}
