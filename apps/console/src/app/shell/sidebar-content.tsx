import { Link, useLocation } from '@tanstack/react-router'
import FolderKanban from '~icons/solar/folder-with-files-linear'
import type { JSX, ReactNode } from 'react'

import { AccountMenu } from '@/app/shell/account-menu'
import { ConsoleSidebar } from '@/app/shell/console-sidebar'
import { MfaReminderCard } from '@/app/shell/mfa-reminder-card'
import { ProjectNav } from '@/app/shell/project-nav'
import { type ProjectSection, projectLocation } from '@/app/shell/project-sections'
import { ProjectSwitcher } from '@/app/shell/project-switcher'

const SIDEBAR_LINK =
  'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors'

/**
 * The open project's sidebar: its header and switcher, the daily pages, a way back to every
 * project, a security reminder, then settings and the account at the foot. Outside a project
 * the console's own sidebar takes its place. The desktop column and the mobile sheet render
 * the same content.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  const { pathname } = useLocation()
  const location = projectLocation(pathname)

  if (location === null) {
    return <ConsoleSidebar pathname={pathname} onNavigate={onNavigate} />
  }

  const navProps = {
    projectId: location.projectId,
    currentSection: location.section,
    onNavigate,
  }

  return (
    <nav aria-label="Projeto" className="flex h-full flex-col gap-3 overflow-y-auto px-3 py-4">
      <ProjectSwitcher projectId={location.projectId} />
      <ProjectNav {...navProps} group="main" />
      <Divider />
      <ul className="grid gap-0.5">
        <li>
          <SidebarLink to="/" onNavigate={onNavigate}>
            <FolderKanban className="size-5 shrink-0" />
            Todos os projetos
          </SidebarLink>
        </li>
      </ul>
      <div className="flex-1" />
      <MfaReminderCard onNavigate={onNavigate} />
      <FooterLinks {...navProps} />
    </nav>
  )
}

function Divider(): JSX.Element {
  return <hr className="border-sidebar-border mx-3" />
}

type FooterLinksProps = {
  projectId: string
  currentSection: ProjectSection
  onNavigate?: () => void
}

function FooterLinks(props: FooterLinksProps): JSX.Element {
  return (
    <div className="grid gap-2">
      <ProjectNav {...props} group="footer" />
      <hr className="border-sidebar-border mx-3" />
      <AccountMenu />
    </div>
  )
}

type SidebarLinkProps = {
  to: '/'
  onNavigate?: () => void
  children: ReactNode
}

function SidebarLink({ to, onNavigate, children }: SidebarLinkProps): JSX.Element {
  return (
    <Link to={to} onClick={onNavigate} className={SIDEBAR_LINK}>
      {children}
    </Link>
  )
}
