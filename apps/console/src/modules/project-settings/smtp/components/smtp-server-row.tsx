import type { JSX, ReactNode } from 'react'

type SmtpServerRowProps = {
  icon: ReactNode
  title: string
  detail: string
  badge: ReactNode
  actions: ReactNode
}

/** One line about the server that sends the emails, with what can be done about it. */
export function SmtpServerRow({
  icon,
  title,
  detail,
  badge,
  actions,
}: SmtpServerRowProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <span className="text-muted-foreground flex shrink-0 items-center">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {badge}
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm text-pretty break-words">{detail}</p>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  )
}
