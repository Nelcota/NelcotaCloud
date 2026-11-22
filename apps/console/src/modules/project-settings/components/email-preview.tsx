import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'

type EmailTemplateText = components['schemas']['EmailTemplateText']

const APP_NAME_PLACEHOLDER = '{app_name}'

type EmailPreviewProps = { text: EmailTemplateText; appName: string }

/** The email as the inbox shows it, following the form as it is typed. */
export function EmailPreview({ text, appName }: EmailPreviewProps): JSX.Element {
  const fill = (value: string): string => value.replaceAll(APP_NAME_PLACEHOLDER, appName)
  const note = fill(text.note).trim()

  return (
    <section
      aria-label="Prévia do email"
      className="min-w-0 overflow-hidden rounded-xl border bg-card lg:sticky lg:top-4"
    >
      <div className="grid gap-1 border-b bg-surface px-5 py-3 text-sm">
        <p className="min-w-0 truncate">
          <span className="text-muted-foreground">De </span>
          {appName}
        </p>
        <p className="min-w-0 font-medium text-heading wrap-anywhere">{fill(text.subject)}</p>
      </div>
      <div className="flex flex-col items-start gap-4 px-5 py-6">
        <h3 className="text-lg font-semibold text-heading wrap-anywhere">{fill(text.heading)}</h3>
        <p className="text-sm whitespace-pre-line text-foreground/85 wrap-anywhere">
          {fill(text.message)}
        </p>
        <span className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {fill(text.action_label)}
        </span>
        <PreviewNote note={note} />
      </div>
    </section>
  )
}

function PreviewNote({ note }: { note: string }): JSX.Element | null {
  if (note === '') {
    return null
  }

  return <p className="text-xs whitespace-pre-line text-muted-foreground wrap-anywhere">{note}</p>
}
