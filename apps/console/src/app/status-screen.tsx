import { type JSX, type ReactNode, use } from 'react'

import { InsideShellContext } from '@/app/shell/inside-shell-context'
import { PublicFrame } from '@/modules/account/components/public-frame'

type StatusScreenProps = {
  title: string
  description: ReactNode
  actions: ReactNode
  /** The evidence under the message: the error report, the missing status code. */
  aside: ReactNode
}

/**
 * A full-page message (an error, a missing page). Under the signed-in frame it is only the
 * message: the frame already shows the brand and owns the page's main landmark.
 */
export function StatusScreen(props: StatusScreenProps): JSX.Element {
  if (use(InsideShellContext)) {
    return (
      <div className="mx-auto w-full max-w-xl rounded-xl border bg-card p-6 sm:p-8">
        <StatusMessage {...props} />
      </div>
    )
  }

  return (
    <PublicFrame size="md">
      <StatusMessage {...props} />
    </PublicFrame>
  )
}

function StatusMessage(props: StatusScreenProps): JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance text-heading">
          {props.title}
        </h1>
        <div className="text-base text-pretty text-muted-foreground">{props.description}</div>
      </div>
      <div className="flex flex-wrap gap-2">{props.actions}</div>
      {props.aside}
    </div>
  )
}
