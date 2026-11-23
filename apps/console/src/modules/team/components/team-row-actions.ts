import type { MemberRow } from '@/modules/team/components/team-rows'

/** `transfer` is not a menu item: it is "Tornar dono" with "e deixar de ser dono" ticked. */
export type MemberAction =
  | 'promote'
  | 'transfer'
  | 'demote'
  | 'restrict'
  | 'allow-edit'
  | 'remove'
  | 'leave'

export type Viewer = {
  isOwnRow: boolean
  canManage: boolean
  /** The viewer owns the project and nobody else does. */
  isSoleOwner: boolean
  /** Anyone else has access, so ownership could be handed to them. */
  hasOthers: boolean
}

export type MenuEntry = { action: MemberAction; isDisabled: boolean }

/** The menu of one row, plus one sentence explaining any disabled item. */
export type RowMenu = { entries: MenuEntry[]; note: string | null }

/** What the viewer may do on a member's row; the API enforces the same rules. */
export function menuFor(row: MemberRow, viewer: Viewer): RowMenu {
  if (viewer.isOwnRow) {
    return ownMenu(row, viewer)
  }

  if (viewer.canManage === false) {
    return { entries: [], note: null }
  }

  if (row.role === 'owner') {
    return { entries: [enabled('demote')], note: null }
  }

  if (row.role === 'viewer') {
    return { entries: [enabled('allow-edit'), enabled('remove')], note: null }
  }

  return { entries: [enabled('promote'), enabled('restrict'), enabled('remove')], note: null }
}

function ownMenu(row: MemberRow, viewer: Viewer): RowMenu {
  if (row.role !== 'owner') {
    return { entries: [enabled('leave')], note: null }
  }

  if (viewer.isSoleOwner === false) {
    return { entries: [enabled('demote'), enabled('leave')], note: null }
  }

  return {
    entries: [
      { action: 'demote', isDisabled: true },
      { action: 'leave', isDisabled: true },
    ],
    note: soleOwnerNote(viewer.hasOthers),
  }
}

/** The way out depends on whether anyone could take the project over. */
function soleOwnerNote(hasOthers: boolean): string {
  if (hasOthers) {
    return 'Você é o único dono. Torne outra pessoa dona antes de sair ou deixar de ser dono.'
  }

  return 'Você é o único dono e a única pessoa com acesso. Convide alguém e torne essa pessoa dona antes de sair.'
}

function enabled(action: MemberAction): MenuEntry {
  return { action, isDisabled: false }
}
