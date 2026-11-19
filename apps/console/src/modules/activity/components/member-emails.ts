import type { components } from '@/shared/api/api-schema'

type TeamMember = components['schemas']['TeamMember']

/** Console accounts by id, to name the member behind an admin action. */
export function emailsById(members: TeamMember[]): ReadonlyMap<string, string> {
  return new Map(members.map((member) => [member.account_id, member.email]))
}
