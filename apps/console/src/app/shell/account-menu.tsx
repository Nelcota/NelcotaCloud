import {
  ChevronsUpDown,
  CircleUser as UserRound,
  LogOut,
  ShieldAlert as ShieldWarning,
} from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'

import { useIsMfaOff } from '@/app/shell/use-is-mfa-off'
import { nelcota } from '@/shared/auth/nelcota'
import { useSession } from '@/shared/auth/use-session'
import { nameOf } from '@/shared/lib/account-name'
import { showFlash } from '@/shared/lib/flash-notice'
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

/**
 * The signed-in console account as the top bar's first chip (its initial on a square, like an
 * organization): its page, the second step reminder and the way out.
 */
export function AccountMenu(): JSX.Element | null {
  const session = useSession()
  const navigate = useNavigate()
  const isMfaOff = useIsMfaOff()

  if (session === null) {
    return null
  }

  const user = session.user
  const email = user.email
  const name = nameOf(email)

  /**
   * The SDK clears the local session even when the server's logout fails; the failure is then
   * said on the login page, since the session may still be valid on the server.
   */
  async function signOut(): Promise<void> {
    try {
      await nelcota.auth.signOut()
    } catch {
      showFlash(
        'Você saiu deste navegador, mas o servidor não confirmou. Encerre as sessões na sua conta se precisar.',
      )
    }

    if (nelcota.auth.getSession() === null) {
      await navigate({ to: '/login' })
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Conta: ${name}${mfaSuffix(isMfaOff)}`}
        className="relative inline-flex h-10 max-w-64 min-w-0 items-center gap-2 rounded-md px-2 text-sm text-foreground hover:bg-surface aria-expanded:bg-surface sm:pe-2"
      >
        <Avatar src={nelcota.auth.avatar.url(user) ?? undefined} name={name} size="xs" isSquare />
        <span className="hidden truncate sm:inline">{name}</span>
        <ChevronsUpDown
          aria-hidden
          className="hidden size-4.5 shrink-0 text-muted-foreground sm:block"
        />
        <MfaDot isMfaOff={isMfaOff} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="w-64">
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

/** Leads to the account's Segurança tab to turn MFA on; shown only while it is off. */
function MfaItem({ isMfaOff }: { isMfaOff: boolean }): JSX.Element | null {
  if (isMfaOff === false) {
    return null
  }

  return (
    <DropdownMenuItem asChild>
      <Link to="/account" hash="seguranca">
        <ShieldWarning aria-hidden className="text-warning" />
        Ativar verificação em duas etapas
      </Link>
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
      aria-hidden
      className="absolute start-3.5 top-0.5 size-2 rounded-full bg-warning ring-2 ring-background"
    />
  )
}

/** The dot's warning is part of the button's name, which replaces its content for screen readers. */
function mfaSuffix(isMfaOff: boolean): string {
  if (isMfaOff) {
    return ', MFA desativado'
  }

  return ''
}
