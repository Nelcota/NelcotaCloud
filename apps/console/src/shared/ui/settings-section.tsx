import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/class-names'

type SettingsSectionProps = {
  title: string
  description?: ReactNode
  children: ReactNode
  /** Bottom bar for the section's action (usually Save), kept apart from the fields. */
  footer?: ReactNode
  tone?: 'default' | 'danger'
}

/** One group of settings: what it is, its fields, and how to apply them. */
export function SettingsSection(props: SettingsSectionProps): JSX.Element {
  return (
    <section
      className={cn(
        'bg-card overflow-hidden rounded-xl border',
        props.tone === 'danger' && 'border-destructive/40',
      )}
    >
      <header className="px-5 pt-5">
        <h2 className="font-semibold">{props.title}</h2>
        <SectionDescription description={props.description} />
      </header>
      <div className="grid gap-4 p-5">{props.children}</div>
      <SectionFooter footer={props.footer} />
    </section>
  )
}

function SectionDescription({ description }: { description?: ReactNode }): JSX.Element | null {
  if (description === undefined) {
    return null
  }

  return <p className="text-muted-foreground mt-1 text-sm text-pretty">{description}</p>
}

function SectionFooter({ footer }: { footer?: ReactNode }): JSX.Element | null {
  if (footer === undefined) {
    return null
  }

  return (
    <footer className="bg-muted/30 flex flex-wrap items-center justify-end gap-3 border-t px-5 py-3">
      {footer}
    </footer>
  )
}
