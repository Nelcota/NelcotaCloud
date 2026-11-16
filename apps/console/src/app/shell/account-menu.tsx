import { useNavigate } from '@tanstack/react-router'
import { ChevronDown, LogOut } from 'lucide-react'
import type { JSX } from 'react'

import { queryClient } from '@/app/query-client'
import { ThemeMenuItem } from '@/app/shell/theme-menu-item'
import { nelcota } from '@/shared/auth/nelcota'
import { useSession } from '@/shared/auth/use-session'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

/** The logged-in console account, the theme and the way out. */
export function AccountMenu(): JSX.Element | null {
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
      <DropdownMenuTrigger className="hover:bg-accent flex min-h-10 items-center gap-2 rounded-md px-2 transition-colors">
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-xs font-semibold">
          {initialsOf(email)}
        </span>
        <span className="hidden max-w-48 truncate text-sm sm:inline">{email}</span>
        <ChevronDown className="text-muted-foreground size-4" strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{email}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <ThemeMenuItem />
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="size-4" strokeWidth={1.75} />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Two letters from the part of the email before `@`. */
function initialsOf(email: string): string {
  const name = email.split('@')[0] ?? ''

  return name.slice(0, 2).toUpperCase()
}
