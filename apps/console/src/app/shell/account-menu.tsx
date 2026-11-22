import { CircleUser as UserRound, LogOut, ShieldAlert as ShieldWarning } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { useIsMfaOff } from '@/app/shell/use-is-mfa-off'
import { nelcota } from '@/shared/auth/nelcota'
import { useSession } from '@/shared/auth/use-session'
import { nameOf } from '@/shared/lib/account-name'
import { RouterLink } from '@/shared/routing/router-link'
import { Avatar } from '@/shared/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

/** The signed-in console account: its page, the second step reminder and the way out. */
export function AccountMenu({ side = 'right' }: { side?: 'right' | 'bottom' }): JSX.Element | null {
  const session = useSession()
  const navigate = useNavigate()
  const isMfaOff = useIsMfaOff()

  if (session === null) {
    return null
  }

  const user = session.user
  const email = user.email
  const name = nameOf(email)

  async function signOut(): Promise<void> {
    try {
      await nelcota.auth.signOut()
    } finally {
      if (nelcota.auth.getSession() === null) {
        await navigate({ to: '/login' })
      }
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Conta: ${name}`}
        className="relative grid size-10 place-items-center rounded-lg hover:bg-surface-hover"
      >
        <Avatar src={nelcota.auth.avatar.url(user) ?? undefined} name={name} size="md" />
        <MfaDot isMfaOff={isMfaOff} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align="end" className="w-64">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate text-sm font-medium text-foreground">{name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <RouterLink href="/account">
              <UserRound aria-hidden />
              Minha conta
            </RouterLink>
          </DropdownMenuItem>
          <MfaItem isMfaOff={isMfaOff} />
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => void signOut()}>
            <LogOut aria-hidden />
            Sair
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Leads to the account page to turn MFA on; shown only while it is off. */
function MfaItem({ isMfaOff }: { isMfaOff: boolean }): JSX.Element | null {
  if (isMfaOff === false) {
    return null
  }

  return (
    <DropdownMenuItem asChild>
      <RouterLink href="/account">
        <ShieldWarning aria-hidden className="text-warning" />
        Ativar verificação em duas etapas
      </RouterLink>
    </DropdownMenuItem>
  )
}

/** A dot on the avatar while MFA is off: the account holds the keys of every project. */
function MfaDot({ isMfaOff }: { isMfaOff: boolean }): JSX.Element | null {
  if (isMfaOff === false) {
    return null
  }

  return (
    <span
      role="img"
      aria-label="Verificação em duas etapas desativada"
      className="absolute end-1 top-1 size-2 rounded-full bg-warning ring-2 ring-frame"
    />
  )
}
