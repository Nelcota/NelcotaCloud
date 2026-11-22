import type { components } from '@/shared/api/api-schema'

type TeamView = components['schemas']['TeamView']

/** Someone with access to the project. */
export type MemberRow = {
  id: string
  email: string
  role: components['schemas']['ProjectRole']
  joinedAt: string
}

/** Someone invited who has not answered yet. */
export type InvitationRow = {
  id: string
  email: string
  createdAt: string
  deliveryStatus: components['schemas']['InvitationDeliveryStatus']
}

/** Small teams read at a glance; a search only helps once the list no longer fits. */
export const SEARCH_THRESHOLD = 8

const LOCALE = 'pt-BR'
const ROLE_ORDER = { owner: 0, member: 1, viewer: 2 }

/** Owners first, then members and viewers, each by arrival. */
export function memberRows(team: TeamView): MemberRow[] {
  return team.members
    .toSorted(
      (a, b) =>
        ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
        Date.parse(a.joined_at) - Date.parse(b.joined_at),
    )
    .map((member) => ({
      id: member.account_id,
      email: member.email,
      role: member.role,
      joinedAt: member.joined_at,
    }))
}

/** The newest invitation first. */
export function invitationRows(team: TeamView): InvitationRow[] {
  return team.invitations
    .toSorted((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      createdAt: invitation.created_at,
      deliveryStatus: invitation.delivery_status,
    }))
}

export function ownerCount(team: TeamView): number {
  return team.members.filter((member) => member.role === 'owner').length
}

export function matchesSearch(email: string, search: string): boolean {
  return email.toLocaleLowerCase(LOCALE).includes(search.trim().toLocaleLowerCase(LOCALE))
}
