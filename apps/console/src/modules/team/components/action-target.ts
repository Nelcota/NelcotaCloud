import type { MemberRow } from '@/modules/team/components/team-rows'

/** The person a member action is about, as the confirmation named them. */
export type ActionTarget = { row: MemberRow; name: string; isOwnRow: boolean }
