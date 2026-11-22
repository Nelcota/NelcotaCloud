import type { JSX } from 'react'

import type { UserMenuItem } from '@/modules/users/components/user-menu-items'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives/dropdown-menu'

/** The menu's items, with the destructive ones set apart after a separator. */
export function UserMenuEntries({ items }: { items: UserMenuItem[] }): JSX.Element {
  const safeItems = items.filter((item) => item.isDestructive !== true)
  const destructiveItems = items.filter((item) => item.isDestructive === true)

  return (
    <>
      {safeItems.map((item) => (
        <Entry key={item.label} item={item} />
      ))}
      {destructiveItems.length > 0 && <DropdownMenuSeparator />}
      {destructiveItems.map((item) => (
        <Entry key={item.label} item={item} />
      ))}
    </>
  )
}

function Entry({ item }: { item: UserMenuItem }): JSX.Element {
  const Glyph = item.icon
  const variant = destructiveVariant(item.isDestructive === true)

  return (
    <DropdownMenuItem variant={variant} onSelect={item.onSelect}>
      <Glyph aria-hidden />
      {item.label}
    </DropdownMenuItem>
  )
}

function destructiveVariant(isDestructive: boolean): 'default' | 'destructive' {
  if (isDestructive) {
    return 'destructive'
  }

  return 'default'
}
