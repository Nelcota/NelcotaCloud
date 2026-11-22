import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import { useTeamQuery } from '@/modules/team/queries/use-team'
import type { components } from '@/shared/api/api-schema'
import { useCurrentAccount } from '@/shared/auth/use-current-account'

type TeamMember = components['schemas']['TeamMember']

/** What every log line needs to name who acted: the team's emails and the signed-in account. */
export function useAuditRowContext(projectId: string): AuditRowContext {
  const team = useTeamQuery(projectId)
  const account = useCurrentAccount()

  return {
    projectId,
    memberEmails: emailsById(team.data?.members ?? []),
    currentAccountId: account.id,
  }
}

function emailsById(members: TeamMember[]): ReadonlyMap<string, string> {
  return new Map(members.map((member) => [member.account_id, member.email]))
}
