import { useId, type FormEvent, type JSX, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type SettingsSectionProps = {
  title: string
  description?: ReactNode
  /** The fields; a section that is only an action (delete) has none. */
  children?: ReactNode
  /** The section's action (usually Save), in the footer bar. */
  footer?: ReactNode
  /** A quiet note at the start of the footer, such as a rule about the value. */
  footerNote?: ReactNode
  /** A mark before the title, such as a provider's logo. */
  leading?: ReactNode
  /** Red border for actions that cannot be undone. */
  isDanger?: boolean
  /** Makes the whole panel a form, so the footer's submit button saves it. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
}

/** One group of settings as a panel: title and description, fields, and a footer bar for the action. */
export function SettingsSection(props: SettingsSectionProps): JSX.Element {
  const titleId = useId()
  const className = cn(
    'min-w-0 overflow-hidden rounded-xl border bg-card',
    props.isDanger === true && 'border-destructive/40',
  )
  const content = (
    <>
      <div className="flex flex-col gap-5 p-6">
        <div className="grid gap-1">
          <div className="flex items-center gap-2.5">
            {props.leading}
            <h2 id={titleId} className="text-lg font-semibold">
              {props.title}
            </h2>
          </div>
          {props.description !== undefined && (
            <div className="max-w-prose text-sm text-muted-foreground">{props.description}</div>
          )}
        </div>
        {props.children !== undefined && (
          <div className="flex flex-col gap-4">{props.children}</div>
        )}
      </div>
      <SectionFooter footer={props.footer} note={props.footerNote} isDanger={props.isDanger} />
    </>
  )

  if (props.onSubmit !== undefined) {
    return (
      <form aria-labelledby={titleId} className={className} onSubmit={props.onSubmit} noValidate>
        {content}
      </form>
    )
  }

  return (
    <section aria-labelledby={titleId} className={className}>
      {content}
    </section>
  )
}

function SectionFooter({
  footer,
  note,
  isDanger,
}: {
  footer?: ReactNode
  note?: ReactNode
  isDanger?: boolean
}): JSX.Element | null {
  if (footer === undefined) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t bg-surface px-6 py-3.5',
        isDanger === true && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div className="min-w-0 text-sm text-muted-foreground">{note}</div>
      <div className="ms-auto flex flex-wrap items-center gap-2">{footer}</div>
    </div>
  )
}
