import { useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'

import { CONSOLE_SECTIONS, consoleSectionOf } from '@/app/shell/console-sections'
import { InvitationsBell } from '@/app/shell/invitations-bell'
import { RailLink } from '@/app/shell/rail-link'
import type { ProjectLocation } from '@/app/shell/project-sections'
import { ThemeToggle } from '@/app/shell/theme-toggle'
import { RouterLink } from '@/shared/routing/router-link'
import { LogoMark } from '@/shared/ui/logo-mark'

/** The narrow column on the black frame: the brand, the console's own places and the account. */
export function IconRail({ location }: { location: ProjectLocation | null }): JSX.Element {
  const { pathname } = useLocation()
  const current = consoleSectionOf(pathname, location !== null)

  return (
    <nav
      aria-label="Console"
      className="hidden w-14 shrink-0 flex-col items-center gap-1 py-3 md:flex"
    >
      <RouterLink
        href="/"
        aria-label="NelcotaCloud, todos os projetos"
        className="mb-3 grid size-10 place-items-center rounded-[10px] hover:bg-surface"
      >
        <LogoMark size={24} />
      </RouterLink>
      {CONSOLE_SECTIONS.map((section) => (
        <RailLink
          key={section.path}
          href={section.path}
          label={section.label}
          icon={section.icon}
          isCurrent={section === current}
        />
      ))}
      <div className="mt-auto flex flex-col items-center gap-1">
        <InvitationsBell />
        <ThemeToggle />
      </div>
    </nav>
  )
}
