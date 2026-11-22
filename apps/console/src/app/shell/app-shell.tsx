import { Outlet, useLocation } from '@tanstack/react-router'
import { type JSX, type ReactNode, useEffect, useRef } from 'react'

import { IconRail } from '@/app/shell/icon-rail'
import { InsideShellContext } from '@/app/shell/inside-shell-context'
import { PanelTopBar } from '@/app/shell/panel-top-bar'
import { ProjectSidebar } from '@/app/shell/project-sidebar'
import { type ProjectLocation, projectLocation } from '@/app/shell/project-sections'
import { useDocumentTitle } from '@/app/shell/use-document-title'
import { UnverifiedEmailBanner } from '@/modules/account/components/unverified-email-banner'
import { useSession } from '@/shared/auth/use-session'
import { cn } from '@/shared/lib/utils'
import { FlashNotice } from '@/shared/ui/flash-notice'

/**
 * The signed-in console: a black frame with the icon rail on the left and one rounded panel
 * that holds the top bar, the project's own navigation and the page.
 */
export function AppShell(): JSX.Element | null {
  const session = useSession()

  if (session === null) {
    return null
  }

  return <SignedInShell />
}

function SignedInShell(): JSX.Element {
  const { pathname } = useLocation()
  const location = projectLocation(pathname)
  const pageTitle = useDocumentTitle()

  return (
    <div className="flex h-dvh min-h-0 bg-frame">
      <a
        href="#console-content"
        className="sr-only z-50 rounded-lg bg-card px-3 py-2 focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        Pular para o conteúdo
      </a>
      <IconRail location={location} />
      <div className="flex min-w-0 flex-1 p-0 md:py-2 md:pe-2">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background md:rounded-2xl">
          <PanelTopBar location={location} pageTitle={pageTitle} />
          <div className="flex min-h-0 flex-1">
            <ProjectNavigation location={location} />
            <PageArea pathname={pathname} isWide={location?.section.segment === 'sql'}>
              <UnverifiedEmailBanner />
              <FlashNotice />
              <InsideShellContext value={true}>
                <Outlet />
              </InsideShellContext>
            </PageArea>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectNavigation({ location }: { location: ProjectLocation | null }): JSX.Element | null {
  if (location === null) {
    return null
  }

  return (
    <aside
      aria-label="Navegação do projeto"
      className="scrollbar-thin hidden w-60 shrink-0 overflow-y-auto overscroll-contain lg:block"
    >
      <ProjectSidebar location={location} />
    </aside>
  )
}

type PageAreaProps = { pathname: string; isWide: boolean; children: ReactNode }

/** The scrolling page; focus moves here after navigation so screen readers start at the page. */
function PageArea({ pathname, isWide, children }: PageAreaProps): JSX.Element {
  const { hash } = useLocation()
  const page = useRef<HTMLElement>(null)
  const previousPath = useRef(pathname)

  useEffect(() => {
    if (previousPath.current === pathname) {
      return
    }

    previousPath.current = pathname
    const content = page.current
    content?.scrollTo({ top: 0 })

    if (hash === '' && content !== null && content.contains(document.activeElement) === false) {
      content.focus({ preventScroll: true })
    }
  }, [hash, pathname])

  return (
    <main
      id="console-content"
      ref={page}
      tabIndex={-1}
      className="scrollbar-thin min-w-0 flex-1 overflow-y-auto overscroll-contain focus:outline-none"
    >
      <div
        key={pathname}
        className={cn(
          '@container mx-auto flex w-full max-w-[76rem] min-w-0 animate-page-in flex-col gap-6 px-4 pt-5 pb-10 sm:px-6 lg:px-8',
          isWide && 'max-w-none pb-5 lg:px-5',
        )}
      >
        {children}
      </div>
    </main>
  )
}
