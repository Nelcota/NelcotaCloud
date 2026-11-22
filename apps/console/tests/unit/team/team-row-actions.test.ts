import { describe, expect, it } from 'vitest'

import {
  type Viewer,
  leaveBlockedReason,
  menuFor,
} from '@/modules/team/components/team-row-actions'
import type { MemberRow } from '@/modules/team/components/team-rows'

function row(role: MemberRow['role']): MemberRow {
  return { id: 'm', email: 'm@example.com', role, joinedAt: '2026-11-01T00:00:00Z' }
}

const owner: Viewer = { isOwnRow: false, canManage: true, isSoleOwner: false, hasOthers: true }
const member: Viewer = { ...owner, canManage: false }

function actions(menu: ReturnType<typeof menuFor>): string[] {
  return menu.entries.map((entry) => entry.action)
}

describe('an owner managing others', () => {
  it('promotes, restricts or removes a member', () => {
    expect(actions(menuFor(row('member'), owner))).toEqual(['promote', 'restrict', 'remove'])
  })

  it('lets a viewer edit again or removes them', () => {
    expect(actions(menuFor(row('viewer'), owner))).toEqual(['allow-edit', 'remove'])
  })

  it('only demotes another owner', () => {
    expect(actions(menuFor(row('owner'), owner))).toEqual(['demote'])
  })
})

describe('everyone else', () => {
  it('sees no actions on other rows', () => {
    expect(menuFor(row('member'), member).entries).toEqual([])
  })

  it('has nothing to change on their own row unless they own the project', () => {
    expect(menuFor(row('viewer'), { ...member, isOwnRow: true }).entries).toEqual([])
    expect(menuFor(row('member'), { ...member, isOwnRow: true }).entries).toEqual([])
  })

  it('keeps the sole owner from leaving', () => {
    const sole = { ...owner, isOwnRow: true, isSoleOwner: true }
    const menu = menuFor(row('owner'), sole)

    expect(menu.entries).toEqual([{ action: 'demote', isDisabled: true }])
    expect(leaveBlockedReason(sole)).toContain('único dono')
    expect(leaveBlockedReason(owner)).toBeNull()
  })
})
