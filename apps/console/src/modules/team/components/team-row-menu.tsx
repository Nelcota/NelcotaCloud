import MoreHorizontal from '~icons/solar/menu-dots-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { MemberActionConfirmation } from '@/modules/team/components/member-action-confirmation'
import { ACTION_COPY, labelFor } from '@/modules/team/components/team-action-copy'
import {
  type MemberAction,
  type MenuEntry,
  type Viewer,
  menuFor,
} from '@/modules/team/components/team-row-actions'
import type { MemberRow } from '@/modules/team/components/team-rows'
import type { ActionTarget } from '@/modules/team/components/action-target'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

type TeamRowMenuProps = {
  row: MemberRow
  viewer: Viewer
  onAction: (target: ActionTarget, action: MemberAction) => Promise<void>
}

/** Every action on one member behind one button; each runs only after its confirmation. */
export function TeamRowMenu({ row, viewer, onAction }: TeamRowMenuProps): JSX.Element | null {
  const [confirming, setConfirming] = useState<MemberAction | null>(null)
  const menu = menuFor(row, viewer)
  const name = nameOf(row, viewer.isOwnRow)

  if (menu.entries.length === 0) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Ações para ${name}`}
          className="hover:bg-accent aria-expanded:bg-accent text-muted-foreground hover:text-foreground flex size-10 items-center justify-center rounded-md transition-colors"
        >
          <MoreHorizontal className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {menu.entries.map((entry) => (
            <MenuItem
              key={entry.action}
              entry={entry}
              isOwnRow={viewer.isOwnRow}
              onSelect={() => setConfirming(entry.action)}
            />
          ))}
          <MenuNote note={menu.note} />
        </DropdownMenuContent>
      </DropdownMenu>
      <MemberActionConfirmation
        key={confirming}
        action={confirming}
        target={{ row, name, isOwnRow: viewer.isOwnRow }}
        onClose={() => setConfirming(null)}
        onConfirm={onAction}
      />
    </>
  )
}

type MenuItemProps = { entry: MenuEntry; isOwnRow: boolean; onSelect: () => void }

function MenuItem({ entry, isOwnRow, onSelect }: MenuItemProps): JSX.Element {
  const copy = ACTION_COPY[entry.action]
  const Icon = copy.icon

  return (
    <DropdownMenuItem
      disabled={entry.isDisabled}
      variant={itemVariant(copy.isDestructive)}
      onClick={onSelect}
      className="min-h-11"
    >
      <Icon />
      {labelFor(entry.action, isOwnRow)}
    </DropdownMenuItem>
  )
}

/** Outside the disabled items, so the reason keeps full contrast instead of their 50% fade. */
function MenuNote({ note }: { note: string | null }): JSX.Element | null {
  if (note === null) {
    return null
  }

  return (
    <p className="text-muted-foreground border-t px-2 pt-2 pb-1.5 text-sm text-pretty">{note}</p>
  )
}

/** "você" on your own row; a member whose email is not known yet is "este membro". */
function nameOf(row: MemberRow, isOwnRow: boolean): string {
  if (isOwnRow) {
    return 'você'
  }

  if (row.email === '') {
    return 'este membro'
  }

  return row.email
}

function itemVariant(isDestructive: boolean): 'destructive' | 'default' {
  if (isDestructive) {
    return 'destructive'
  }

  return 'default'
}
