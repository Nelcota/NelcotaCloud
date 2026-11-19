import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import {
  type ConsoleSection,
  CONSOLE_SECTIONS,
  consoleSectionOf,
} from '@/app/shell/console-sections'
import { MfaReminderCard } from '@/app/shell/mfa-reminder-card'
import { SIDEBAR_ITEM, SIDEBAR_ITEM_CURRENT } from '@/app/shell/sidebar-item'
import { cn } from '@/shared/lib/class-names'

type ConsoleSidebarProps = {
  pathname: string
  onNavigate?: () => void
}

/** The sidebar list outside a project: the console's pages and a security reminder. */
export function ConsoleSidebar({ pathname, onNavigate }: ConsoleSidebarProps): JSX.Element {
  const currentSection = consoleSectionOf(pathname)

  return (
    <nav aria-label="Conta" className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      <p className="flex min-h-12 items-center pr-10 pl-2 text-base font-bold md:pr-2">Nelcota</p>
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
    </nav>
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
      className={cn(SIDEBAR_ITEM, isCurrent && SIDEBAR_ITEM_CURRENT)}
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

  return <section.icon className="text-muted-foreground size-5 shrink-0" />
}
