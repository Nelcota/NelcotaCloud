import { Ellipsis } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import type { ActionTarget } from '@/modules/team/components/action-target'
import { MemberActionConfirmation } from '@/modules/team/components/member-action-confirmation'
import { ACTION_COPY, labelFor } from '@/modules/team/components/team-action-copy'
import {
  type MemberAction,
  type MenuEntry,
  type Viewer,
  menuFor,
} from '@/modules/team/components/team-row-actions'
import type { MemberRow } from '@/modules/team/components/team-rows'
import { Button } from '@/shared/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

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
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Ações para ${name}`}>
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
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
  const Glyph = copy.icon

  return (
    <DropdownMenuItem
      disabled={entry.isDisabled}
      variant={itemVariant(copy.isDestructive)}
      onSelect={onSelect}
    >
      <Glyph aria-hidden />
      {labelFor(entry.action, isOwnRow)}
    </DropdownMenuItem>
  )
}

/** Outside the disabled items, so the reason keeps full contrast instead of their fade. */
function MenuNote({ note }: { note: string | null }): JSX.Element | null {
  if (note === null) {
    return null
  }

  return (
    <>
      <DropdownMenuSeparator />
      <p className="px-2 py-1.5 text-xs text-pretty text-muted-foreground">{note}</p>
    </>
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
