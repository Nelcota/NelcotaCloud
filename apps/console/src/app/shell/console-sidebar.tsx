import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { AccountMenu } from '@/app/shell/account-menu'
import { ApiStatusDot } from '@/app/shell/api-status-dot'
import {
  type ConsoleSection,
  CONSOLE_SECTIONS,
  consoleSectionOf,
} from '@/app/shell/console-sections'
import { MfaReminderCard } from '@/app/shell/mfa-reminder-card'
import { cn } from '@/shared/lib/class-names'
import { LogoMark } from '@/shared/ui/logo-mark'

type ConsoleSidebarProps = {
  pathname: string
  onNavigate?: () => void
}

/** The sidebar outside a project: the console's pages, a security reminder and the account. */
export function ConsoleSidebar({ pathname, onNavigate }: ConsoleSidebarProps): JSX.Element {
  const currentSection = consoleSectionOf(pathname)

  return (
    <nav aria-label="Console" className="flex h-full flex-col gap-3 overflow-y-auto px-3 py-4">
      <Brand onNavigate={onNavigate} />
      <ul className="grid gap-0.5">
        {CONSOLE_SECTIONS.map((section) => (
          <li key={section.path}>
            <SectionLink
              section={section}
              isCurrent={section === currentSection}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
      <div className="flex-1" />
      <MfaReminderCard onNavigate={onNavigate} />
      <hr className="border-sidebar-border mx-3" />
      <AccountMenu />
    </nav>
  )
}

/** The logo where the project sidebar has its switcher, with the API status on its tile. */
function Brand({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  return (
    <div className="flex min-h-15 items-center gap-3 p-2">
      <span className="relative shrink-0">
        <LogoMark className="size-11 rounded-lg p-2" />
        <ApiStatusDot />
      </span>
      <Link
        to="/"
        onClick={onNavigate}
        className="truncate rounded-md text-base font-semibold tracking-tight"
      >
        NelcotaCloud
      </Link>
    </div>
  )
}

type SectionLinkProps = {
  section: ConsoleSection
  isCurrent: boolean
  onNavigate?: () => void
}

function SectionLink({ section, isCurrent, onNavigate }: SectionLinkProps): JSX.Element {
  return (
    <Link
      to={section.path}
      onClick={onNavigate}
      activeOptions={{ exact: true }}
      className={cn(
        'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors',
        isCurrent && 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold',
      )}
    >
      <SectionIcon section={section} isCurrent={isCurrent} />
      <span className="min-w-0 flex-1 truncate">{section.label}</span>
    </Link>
  )
}

function SectionIcon({ section, isCurrent }: Omit<SectionLinkProps, 'onNavigate'>): JSX.Element {
  if (isCurrent) {
    return <section.currentIcon className="text-primary-ink size-5 shrink-0" />
  }

  return <section.icon className="size-5 shrink-0" />
}
