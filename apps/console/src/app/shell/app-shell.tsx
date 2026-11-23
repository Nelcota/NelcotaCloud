import { Outlet } from '@tanstack/react-router'
import type { JSX, ReactNode } from 'react'

import { NavRail } from '@/app/shell/nav-rail'
import { ProjectWriteAccess } from '@/app/shell/project-write-access'
import { SidebarContent } from '@/app/shell/sidebar-content'
import { TopBar } from '@/app/shell/top-bar'
import { UnverifiedEmailBanner } from '@/modules/account/components/unverified-email-banner'
import { FlashNotice } from '@/shared/ui/flash-notice'
import { PAGE_SCROLLER_ID } from '@/app/shell/page-scroller'

/**
 * The signed-in console, laid out like a desktop app: an icon rail on the shell (the console and
 * every project), then one rounded panel holding the sidebar list and the page. Below md the rail
 * and the list move into the top bar's menu sheet.
 */
export function AppShell(): JSX.Element {
  return (
    <ShellFrame>
      <Page />
    </ShellFrame>
  )
}

function Page(): JSX.Element {
  return (
    <>
      <TopBar />
      <main className="flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:px-10">
        {/* Pages read best in a column; a page of wide data (`data-wide-page`) takes the room. */}
        <div className="mx-auto max-w-5xl has-[[data-wide-page]]:max-w-none">
          <UnverifiedEmailBanner />
          <ProjectWriteAccess>
            <Outlet />
          </ProjectWriteAccess>
        </div>
      </main>
    </>
  )
}

/**
 * The panel scrolls on its own, so the rail, the list and the rounded corners stay put. The
 * scroller is positioned so absolute descendants (screen-reader-only text) scroll and clip with
 * it instead of stretching the document below the panel. The flash notice sits beside the
 * scroller, so it floats over the page's own column and stays put while the page scrolls.
 */
function ShellFrame({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="bg-shell flex h-svh overflow-hidden md:py-2 md:pr-2">
      <div className="hidden md:flex">
        <NavRail />
      </div>
      <div className="bg-background flex min-w-0 flex-1 overflow-hidden md:rounded-2xl md:border">
        <aside className="bg-sidebar hidden w-72 shrink-0 border-r md:block">
          <SidebarContent />
        </aside>
        <div className="relative flex min-w-0 flex-1">
          <div
            data-scroll-restoration-id={PAGE_SCROLLER_ID}
            className="relative flex min-w-0 flex-1 flex-col overflow-y-auto [scrollbar-gutter:stable]"
          >
            {children}
          </div>
          <FlashNotice />
        </div>
      </div>
    </div>
  )
}
