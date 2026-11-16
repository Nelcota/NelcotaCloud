import { useNavigate } from '@tanstack/react-router'
import ChevronDown from '~icons/solar/alt-arrow-down-linear'
import ChevronsUpDown from '~icons/solar/sort-vertical-linear'
import LogOut from '~icons/solar/logout-2-linear'
import UserRound from '~icons/solar/user-circle-linear'
import type { JSX } from 'react'

import { queryClient } from '@/app/query-client'
import { ThemeMenuItem } from '@/app/shell/theme-menu-item'
import { nelcota } from '@/shared/auth/nelcota'
import { useSession } from '@/shared/auth/use-session'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

type AccountMenuProps = {
  /** At the foot of the project sidebar it is a large block opening upward; elsewhere compact. */
  placement: 'sidebar' | 'top-bar'
}

/** The logged-in console account: its page, the theme and the way out. */
export function AccountMenu({ placement }: AccountMenuProps): JSX.Element | null {
  const session = useSession()
  const navigate = useNavigate()

  if (session === null) {
    return null
  }

  const email = session.user.email

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
      <AccountTrigger email={email} placement={placement} />
      <DropdownMenuContent {...menuPosition(placement)}>
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

function menuPosition(placement: AccountMenuProps['placement']): {
  side: 'top' | 'bottom'
  align: 'start' | 'end'
  className: string
} {
  if (placement === 'sidebar') {
    return { side: 'top', align: 'start', className: 'w-(--anchor-width)' }
  }

  return { side: 'bottom', align: 'end', className: 'w-60' }
}

type AccountTriggerProps = AccountMenuProps & { email: string }

function AccountTrigger({ email, placement }: AccountTriggerProps): JSX.Element {
  if (placement === 'sidebar') {
    return (
      <DropdownMenuTrigger
        aria-label={`Conta ${email}`}
        className="hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent flex w-full min-w-0 items-center gap-3 rounded-lg p-2 text-left transition-colors"
      >
        <Avatar email={email} className="size-11 text-base" />
        <span aria-hidden="true" className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{nameOf(email)}</span>
          <span className="text-muted-foreground block truncate text-xs">{email}</span>
        </span>
        <ChevronsUpDown className="text-muted-foreground size-5 shrink-0" />
      </DropdownMenuTrigger>
    )
  }

  return (
    <DropdownMenuTrigger
      aria-label={`Conta ${email}`}
      className="hover:bg-accent flex min-h-11 items-center gap-2 rounded-lg px-2 transition-colors"
    >
      <Avatar email={email} className="size-9 text-sm" />
      <span aria-hidden="true" className="hidden max-w-56 truncate text-sm sm:inline">
        {email}
      </span>
      <ChevronDown className="text-muted-foreground size-5" />
    </DropdownMenuTrigger>
  )
}

function Avatar({ email, className }: { email: string; className: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`bg-primary text-primary-foreground flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
    >
      {nameOf(email).slice(0, 2).toUpperCase()}
    </span>
  )
}

/** The part of the email before `@`: the closest thing to a name a console account has. */
function nameOf(email: string): string {
  return email.split('@')[0] ?? email
}
