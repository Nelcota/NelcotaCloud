import { useRouter } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import { AccountMenu } from '@/app/shell/account-menu'
import { ApiStatusDot } from '@/app/shell/api-status-dot'
import { CommandSearch } from '@/app/shell/command-search'
import { HeaderBreadcrumbs } from '@/app/shell/header-breadcrumbs'
import { MobileNavigation } from '@/app/shell/mobile-navigation'
import type { ProjectLocation } from '@/app/shell/project-sections'
import { AiAssistantDialog } from '@/modules/overview/components/ai-assistant-dialog'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/primitives/button'

type PanelTopBarProps = {
  location: ProjectLocation | null
  pageTitle: string
}

/**
 * The bar across the panel: the account, history arrows, where the page sits, search and IA.
 * Its end padding is the page's gutter, so the last control ends on the page actions' edge;
 * below `lg` its start padding puts the menu icon on the page's text line.
 */
export function PanelTopBar({ location, pageTitle }: PanelTopBarProps): JSX.Element {
  const isInProject = location !== null

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b-2 border-border ps-1.5 pe-4 sm:ps-3.5 sm:pe-6 lg:ps-2 lg:pe-8">
      <MobileNavigation location={location} />
      <SidebarColumn isInProject={isInProject}>
        <AccountMenu />
        <HistoryArrows />
      </SidebarColumn>
      {/* With the bar's gap, the page's gutter (lg:px-8): the path starts on the page title's line. */}
      <div className={cn('flex min-w-0 flex-1', isInProject && 'lg:ps-6')}>
        <HeaderBreadcrumbs location={location} pageTitle={pageTitle} />
      </div>
      <div className="ms-auto flex shrink-0 items-center gap-2">
        <ApiStatusDot />
        <CommandSearch projectId={location?.projectId ?? null} />
        <ProjectAssistant location={location} />
      </div>
    </header>
  )
}

type SidebarColumnProps = { isInProject: boolean; children: ReactNode }

/**
 * Inside a project, as wide as the sidebar below (its 240px minus the bar's 8px start padding),
 * so the account sits over the sidebar and the path over the page.
 */
function SidebarColumn({ isInProject, children }: SidebarColumnProps): JSX.Element {
  return (
    <div className={cn('flex min-w-0 shrink-0 items-center gap-2', isInProject && 'lg:w-58')}>
      {children}
    </div>
  )
}

function HistoryArrows(): JSX.Element {
  const router = useRouter()

  return (
    <div className="hidden shrink-0 items-center md:flex">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Voltar"
        onClick={() => router.history.back()}
      >
        <ChevronLeft aria-hidden />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Avançar"
        onClick={() => router.history.forward()}
      >
        <ChevronRight aria-hidden />
      </Button>
    </div>
  )
}

function ProjectAssistant({ location }: { location: ProjectLocation | null }): JSX.Element | null {
  if (location === null) {
    return null
  }

  return <AiAssistantDialog projectId={location.projectId} />
}
