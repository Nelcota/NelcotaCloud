import { useNavigate } from '@tanstack/react-router'
import ChevronsUpDown from '~icons/solar/sort-vertical-linear'
import LogOut from '~icons/solar/logout-2-linear'
import UserRound from '~icons/solar/user-circle-linear'
import type { JSX } from 'react'

import { queryClient } from '@/app/query-client'
import { ThemeMenuItem } from '@/app/shell/theme-menu-item'
import { nelcota } from '@/shared/auth/nelcota'
import { useSession } from '@/shared/auth/use-session'
import { nameOf } from '@/shared/lib/account-name'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { UserAvatar } from '@/shared/ui/user-avatar'

/** The logged-in console account at the foot of the sidebar: its page, the theme and the way out. */
export function AccountMenu(): JSX.Element | null {
  const session = useSession()
  const navigate = useNavigate()

  if (session === null) {
    return null
  }

  const user = session.user
  const email = user.email
  const photoUrl = nelcota.auth.avatar.url(user)

  async function signOut(): Promise<void> {
    try {
      await nelcota.auth.signOut()
    } finally {
      queryClient.clear()
      await navigate({ to: '/login' })
    }
  }

  return (
    <DropdownMenu>
      <AccountTrigger email={email} photoUrl={photoUrl} />
      {/* Opens upward, as wide as the trigger. */}
      <DropdownMenuContent side="top" align="start" className="w-(--anchor-width)">
        <DropdownMenuItem onClick={() => navigate({ to: '/account' })}>
          <UserRound />
          Minha conta
        </DropdownMenuItem>
        <ThemeMenuItem />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AccountTrigger({
  email,
  photoUrl,
}: {
  email: string
  photoUrl: string | null
}): JSX.Element {
  return (
    <DropdownMenuTrigger
      aria-label={`Conta ${email}`}
      className="hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent flex w-full min-w-0 items-center gap-3 rounded-lg p-2 text-left transition-colors"
    >
      <UserAvatar email={email} photoUrl={photoUrl} className="size-11 text-base" />
      <span aria-hidden="true" className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{nameOf(email)}</span>
        <span className="text-muted-foreground block truncate text-xs">{email}</span>
      </span>
      <ChevronsUpDown className="text-muted-foreground size-5 shrink-0" />
    </DropdownMenuTrigger>
  )
}
