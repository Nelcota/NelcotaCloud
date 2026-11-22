import type { JSX } from 'react'

import { EmailPreviewHeader } from '@/modules/project-settings/components/email-preview-header'
import type { components } from '@/shared/api/api-schema'

type EmailTemplateText = components['schemas']['EmailTemplateText']

const APP_NAME_PLACEHOLDER = '{app_name}'

type EmailPreviewProps = {
  text: EmailTemplateText
  appName: string
  /** Which email this is ("Verificação"), for screen readers. */
  kindLabel: string
}

/** The email as a mail client shows it, following the form as it is typed. */
export function EmailPreview({ text, appName, kindLabel }: EmailPreviewProps): JSX.Element {
  const fill = (value: string): string => value.replaceAll(APP_NAME_PLACEHOLDER, appName)
  const note = fill(text.note).trim()

  return (
    <section
      aria-label={`Prévia do email: ${kindLabel}`}
      className="min-w-0 overflow-hidden rounded-xl bg-surface p-1 lg:sticky lg:top-4"
    >
      <p className="px-3 pt-1.5 pb-2 text-xs text-muted-foreground">Prévia</p>
      <div className="overflow-hidden rounded-lg bg-background">
        <EmailPreviewHeader subject={fill(text.subject)} appName={appName} />
        <div className="flex flex-col items-start gap-3 border-t border-border/60 px-6 py-6">
          <h3 className="text-base font-medium wrap-anywhere">{fill(text.heading)}</h3>
          <p className="text-sm whitespace-pre-line text-muted-foreground wrap-anywhere">
            {fill(text.message)}
          </p>
          <span className="mt-1 rounded-md bg-primary-fill px-3.5 py-2 text-xs font-medium text-primary-foreground">
            {fill(text.action_label)}
          </span>
          <PreviewNote note={note} />
        </div>
      </div>
    </section>
  )
}

function PreviewNote({ note }: { note: string }): JSX.Element | null {
  if (note === '') {
    return null
  }

  return (
    <p className="mt-1 text-xs whitespace-pre-line text-muted-foreground wrap-anywhere">{note}</p>
  )
}
