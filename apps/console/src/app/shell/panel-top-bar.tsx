import { useRouter } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { JSX } from 'react'

import { AccountMenu } from '@/app/shell/account-menu'
import { ApiStatusDot } from '@/app/shell/api-status-dot'
import { CommandSearch } from '@/app/shell/command-search'
import { HeaderBreadcrumbs } from '@/app/shell/header-breadcrumbs'
import { MobileNavigation } from '@/app/shell/mobile-navigation'
import type { ProjectLocation } from '@/app/shell/project-sections'
import { AiAssistantDialog } from '@/modules/overview/components/ai-assistant-dialog'
import { Button } from '@/shared/ui/primitives/button'

type PanelTopBarProps = {
  location: ProjectLocation | null
  pageTitle: string
}

/** The bar across the panel: the account, history arrows, where the page sits, search and IA. */
export function PanelTopBar({ location, pageTitle }: PanelTopBarProps): JSX.Element {
  const router = useRouter()

  return (
    <header className="flex h-12 shrink-0 items-center gap-1.5 px-2 sm:px-3">
      <MobileNavigation location={location} />
      <AccountMenu />
      <div className="hidden items-center md:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Voltar"
          onClick={() => router.history.back()}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Avançar"
          onClick={() => router.history.forward()}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <HeaderBreadcrumbs location={location} pageTitle={pageTitle} />
      <div className="ms-auto flex shrink-0 items-center gap-1.5">
        <ApiStatusDot />
        <CommandSearch projectId={location?.projectId ?? null} />
        <ProjectAssistant location={location} />
      </div>
    </header>
  )
}

function ProjectAssistant({ location }: { location: ProjectLocation | null }): JSX.Element | null {
  if (location === null) {
    return null
  }

  return <AiAssistantDialog projectId={location.projectId} />
}
