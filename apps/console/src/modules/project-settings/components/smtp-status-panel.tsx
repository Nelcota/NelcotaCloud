import type { JSX } from 'react'

import { SmtpFacts } from '@/modules/project-settings/components/smtp-facts'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/utils'
import { StatusBadge } from '@/shared/ui/status-badge'

type SmtpSettingsView = components['schemas']['SmtpSettingsView']

const PLATFORM_SENDER = 'NelcotaCloud'

/** Who sends the project's emails, in large type, with the server's facts below. */
export function SmtpStatusPanel({
  view,
  className,
}: {
  view: SmtpSettingsView
  className?: string
}): JSX.Element {
  return (
    <section
      aria-label="Envio dos emails"
      className={cn('min-w-0 overflow-hidden rounded-xl border bg-card', className)}
    >
      <div className="grid gap-1 border-b px-6 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">Seus emails saem por</p>
          <SourceBadge isCustom={view.is_custom} />
        </div>
        <p className="text-3xl font-semibold tracking-tight text-heading wrap-anywhere">
          {senderOf(view)}
        </p>
      </div>
      <div className="px-6 py-1">
        <SmtpFacts view={view} />
      </div>
    </section>
  )
}

function SourceBadge({ isCustom }: { isCustom: boolean }): JSX.Element {
  if (isCustom) {
    return <StatusBadge tone="success">SMTP próprio</StatusBadge>
  }

  return <StatusBadge>SMTP da plataforma</StatusBadge>
}

function senderOf(view: SmtpSettingsView): string {
  if (view.is_custom) {
    return view.smtp_host ?? 'seu servidor'
  }

  return PLATFORM_SENDER
}
