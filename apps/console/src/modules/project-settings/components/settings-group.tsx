import type { FormEvent, JSX, ReactNode } from 'react'

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

/** A settings panel whose body is a list of setting rows split by hairlines. */
export function SettingsGroup({ children, ...section }: SettingsGroupProps): JSX.Element {
  return (
    <SettingsSection {...section}>
      <div className="-my-1 divide-y divide-border/60">{children}</div>
    </SettingsSection>
  )
}
