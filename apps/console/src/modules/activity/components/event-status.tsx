import type { JSX } from 'react'

import { levelOf } from '@/modules/activity/components/log-levels'
import type { components } from '@/shared/api/api-schema'
import { StatusBadge } from '@/shared/ui/status-badge'

type AuditAction = components['schemas']['AuditAction']

/** Only what needs a look gets a pill; routine events stay quiet. */
export function EventStatus({ action }: { action: AuditAction }): JSX.Element | null {
  const level = levelOf(action)

  if (level === 'error') {
    return <StatusBadge tone="error">Suspeito</StatusBadge>
  }

  if (level === 'warn') {
    return <StatusBadge tone="warning">Recusado</StatusBadge>
  }

  return null
}
