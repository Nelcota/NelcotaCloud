import type { FormEvent, JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { SettingsSection } from '@/shared/ui/settings-section'

type SettingsGroupProps = {
  title: string
  /** One line under the title: what the settings mean. */
  description?: ReactNode
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

/**
 * A settings panel whose rows run from edge to edge, split from the title and from each other
 * by full-width lines, so every setting reads as its own band.
 */
export function SettingsGroup({ children, ...section }: SettingsGroupProps): JSX.Element {
  return (
    <SettingsSection {...section}>
      <div
        className={cn(
          '-mx-5 -mb-5 divide-y border-t [&>*]:px-5',
          section.isDanger === true && 'divide-destructive/30 border-destructive/30',
          section.isDanger !== true && 'divide-divider border-divider',
        )}
      >
        {children}
      </div>
    </SettingsSection>
  )
}
