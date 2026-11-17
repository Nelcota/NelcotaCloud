import { Outlet } from '@tanstack/react-router'
import type { JSX, ReactNode } from 'react'

import { SidebarContent } from '@/app/shell/sidebar-content'
import { TopBar } from '@/app/shell/top-bar'
import { UnverifiedEmailBanner } from '@/modules/account/components/unverified-email-banner'
import { FlashNotice } from '@/shared/ui/flash-notice'

/**
 * The signed-in console: the sidebar (the project's, or the console's outside a project) and
 * the page under a top bar. Below md the sidebar moves into the top bar's menu sheet.
 */
export function AppShell(): JSX.Element {
  return (
    <SidebarFrame>
      <Page />
    </SidebarFrame>
  )
}

function Page(): JSX.Element {
  return (
    <>
      <TopBar />
      <main className="flex-1 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <UnverifiedEmailBanner />
          <FlashNotice />
          <Outlet />
        </div>
      </main>
    </>
  )
}

/**
 * The page is a panel inset in the sidebar's color, with a rounded top-left
 * corner where it meets the sidebar. The panel scrolls on its own, so the corner stays put.
 */
function SidebarFrame({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div className="bg-sidebar flex h-svh overflow-hidden">
      <aside className="hidden h-full w-72 shrink-0 md:block">
        <SidebarContent />
      </aside>
      <div className="bg-background md:border-foreground/10 flex min-w-0 flex-1 flex-col overflow-y-auto md:mt-5 md:rounded-tl-[1.75rem] md:border-t md:border-l">
        {children}
      </div>
    </div>
  )
}
