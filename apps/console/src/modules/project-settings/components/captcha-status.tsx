import type { JSX } from 'react'

import { StatusBadge } from '@/shared/ui/status-badge'

/** Whether the project asks for the captcha. */
export function CaptchaStatus({ siteKey }: { siteKey: string | null }): JSX.Element {
  if (siteKey === null) {
    return <StatusBadge>Desativado</StatusBadge>
  }

  return <StatusBadge tone="success">Ativo</StatusBadge>
}
