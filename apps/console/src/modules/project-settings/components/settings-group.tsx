import { useId, type FormEvent, type JSX, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type SettingsGroupProps = {
  title: string
  /** A mark after the title, such as a status badge. */
  meta?: ReactNode
  /** The rows (`SettingsRow`). */
  children: ReactNode
  /** The group's actions (usually Save), at the end of the footer bar. */
  footer?: ReactNode
  /** The rule behind the values, at the start of the footer bar. */
  footerNote?: ReactNode
  /** Red border for actions that cannot be undone. */
  isDanger?: boolean
  /** Makes the group a form, so the footer's submit button saves it. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
}

/** One framed panel of setting rows with a footer bar for its action. */
export function SettingsGroup(props: SettingsGroupProps): JSX.Element {
  const titleId = useId()
  const className = cn(
    'min-w-0 overflow-hidden rounded-xl border bg-card',
    props.isDanger === true && 'border-destructive/40',
  )
  const content = (
    <>
      <div
        className={cn(
          'flex items-center gap-2 border-b px-6 py-3.5',
          props.isDanger === true && 'border-destructive/30',
        )}
      >
        <h3 id={titleId} className="text-sm font-semibold text-heading">
          {props.title}
        </h3>
        {props.meta}
      </div>
      <div className={cn('divide-y', props.isDanger === true && 'divide-destructive/20')}>
        {props.children}
      </div>
      <GroupFooter footer={props.footer} note={props.footerNote} isDanger={props.isDanger} />
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

type GroupFooterProps = { footer?: ReactNode; note?: ReactNode; isDanger?: boolean }

function GroupFooter({ footer, note, isDanger }: GroupFooterProps): JSX.Element | null {
  if (footer === undefined && note === undefined) {
    return null
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t bg-surface px-6 py-3',
        isDanger === true && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <div className="min-w-0 text-sm text-muted-foreground">{note}</div>
      <div className="ms-auto flex flex-wrap items-center gap-2">{footer}</div>
    </div>
  )
}
