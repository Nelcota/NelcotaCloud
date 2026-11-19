import type { JSX, ReactNode } from 'react'
import { useEffect } from 'react'

import { AuthMascotFan } from '@/modules/account/components/auth-mascots'
import { type StatusMark, StatusIcon } from '@/shared/ui/status-icon'

type StatusScreenProps = {
  title: string
  /** The browser tab's name, short: "Página não encontrada", "Erro". */
  tabTitle: string
  /** The icon above the title: what kind of trouble this is. */
  mark: StatusMark
  description: ReactNode
  actions: ReactNode
  /** What a support request needs, folded under the actions; most people never open it. */
  details?: ReactNode
}

/**
 * A full-screen message (an error, a missing page), in the same frame as the login: the shell,
 * the mascots and one centered column. It covers the screen because the router renders it
 * inside whichever layout the route belongs to.
 */
export function StatusScreen(props: StatusScreenProps): JSX.Element {
  const tabTitle = props.tabTitle

  useEffect(() => {
    document.title = `${tabTitle} · Nelcota`
  }, [tabTitle])

  return (
    <div className="bg-shell fixed inset-0 z-50 flex overflow-y-auto md:p-2">
      <main className="bg-background flex min-h-full min-w-0 flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 md:rounded-2xl md:border">
        <div className="grid w-full max-w-sm gap-8">
          <AuthMascotFan isCalm={props.mark.tone === 'danger'} />
          <header className="grid justify-items-center gap-2 text-center">
            <StatusIcon mark={props.mark} />
            <h1 className="text-3xl leading-tight text-balance sm:text-4xl">{props.title}</h1>
            <p className="text-muted-foreground text-base text-pretty sm:text-lg">
              {props.description}
            </p>
          </header>
          <div className="grid gap-3 [&>*]:h-11 [&>*]:w-full [&>*]:text-base">{props.actions}</div>
          {props.details}
        </div>
      </main>
    </div>
  )
}
