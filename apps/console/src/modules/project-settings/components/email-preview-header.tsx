import type { JSX } from 'react'

type EmailPreviewHeaderProps = { subject: string; appName: string }

/** The subject over the sender, the way an inbox opens a message. */
export function EmailPreviewHeader({ subject, appName }: EmailPreviewHeaderProps): JSX.Element {
  return (
    <div className="grid gap-3 px-4 py-3.5">
      <p className="text-sm font-medium wrap-anywhere">{subject}</p>
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-hover text-xs font-medium"
        >
          {initialOf(appName)}
        </span>
        <p className="min-w-0 truncate text-xs">
          <span className="text-muted-foreground">De </span>
          <span className="font-medium">{appName}</span>
        </p>
      </div>
    </div>
  )
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}
