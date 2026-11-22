import type { JSX } from 'react'

import { useSmtpQuery } from '@/modules/project-settings/queries/use-project-settings'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { StatusBadge } from '@/shared/ui/status-badge'

/** Whether auth emails leave through the project's own SMTP server or the platform's. */
export function SmtpMethodStatus({ projectId }: { projectId: string }): JSX.Element | null {
  const smtp = useSmtpQuery(projectId)

  if (smtp.isPending) {
    return <Skeleton className="h-5 w-24" />
  }

  if (smtp.data === undefined) {
    return null
  }

  if (smtp.data.is_custom) {
    return <StatusBadge tone="success">SMTP próprio</StatusBadge>
  }

  return <StatusBadge>SMTP da plataforma</StatusBadge>
}
