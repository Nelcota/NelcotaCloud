import type { JSX } from 'react'

import { SettingsRow } from '@/modules/project-settings/components/settings-row'
import { IdChip } from '@/shared/ui/id-chip'

type EndpointRowProps = {
  label: string
  meaning: string
  value: string
}

/** An address or identifier with what it is for, ready to copy. */
export function EndpointRow({ label, meaning, value }: EndpointRowProps): JSX.Element {
  return (
    <SettingsRow title={label} description={meaning} isWide>
      <IdChip label={label} value={value} className="w-full" />
    </SettingsRow>
  )
}
