import { useNavigate } from '@tanstack/react-router'
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

/** The logged-in console account at the foot of the rail: its page, the theme and the way out. */
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
      <DropdownMenuContent side="right" align="end" sideOffset={10} className="w-64">
        <AccountSummary email={email} />
        <DropdownMenuSeparator />
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
      className="hover:ring-foreground/20 aria-expanded:ring-foreground/40 mt-2 flex shrink-0 rounded-full ring-2 ring-transparent transition-shadow"
    >
      <UserAvatar email={email} photoUrl={photoUrl} className="size-9 text-xs" />
    </DropdownMenuTrigger>
  )
}

/** Who is signed in: the rail shows only the avatar, so the menu names the account. */
function AccountSummary({ email }: { email: string }): JSX.Element {
  return (
    <div className="min-w-0 px-2 py-1.5">
      <p className="truncate text-sm font-semibold">{nameOf(email)}</p>
      <p className="text-muted-foreground truncate text-xs">{email}</p>
    </div>
  )
}
