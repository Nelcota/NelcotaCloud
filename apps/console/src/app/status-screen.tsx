import { type JSX, type ReactNode, use } from 'react'

import { InsideShellContext } from '@/app/shell/inside-shell-context'
import { PublicFrame } from '@/modules/account/components/public-frame'

type StatusScreenProps = {
  /** The status in mono above the title ("Erro 404"). */
  code: string
  title: string
  description: ReactNode
  actions: ReactNode
  /** The evidence under the message, such as the error report. */
  aside?: ReactNode
}

/**
 * A full-page message (an error, a missing page). Under the signed-in frame it is only the
 * message: the frame already shows the brand and owns the page's main landmark.
 */
export function StatusScreen(props: StatusScreenProps): JSX.Element {
  if (use(InsideShellContext)) {
    return (
      <div className="mx-auto mt-6 w-full max-w-lg overflow-hidden rounded-xl bg-card sm:mt-12">
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
    <div className="flex flex-col gap-5 p-6">
      <div className="grid gap-1.5">
        <p className="font-mono text-xs text-muted-foreground">{props.code}</p>
        <h1 className="text-xl font-medium text-balance text-heading">{props.title}</h1>
        <div className="text-xs text-pretty text-muted-foreground">{props.description}</div>
      </div>
      <div className="flex flex-wrap gap-2">{props.actions}</div>
      {props.aside}
    </div>
  )
}
