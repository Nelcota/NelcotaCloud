import type { JSX } from 'react'

import { SmtpStatusPanel } from '@/modules/project-settings/components/smtp-status-panel'
import { SmtpTestSection } from '@/modules/project-settings/components/smtp-test-section'
import type { components } from '@/shared/api/api-schema'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type SmtpOverviewProps = {
  projectId: string
  /** `undefined` while loading. */
  view: components['schemas']['SmtpSettingsView'] | undefined
  /** The load failed: the page shows the error and its retry, so this shows nothing. */
  hasFailed: boolean
}

/**
 * Who sends the emails, and beside it the test send. Testing only makes sense, and is only
 * allowed, for the project's own server.
 */
export function SmtpOverview({
  projectId,
  view,
  hasFailed,
}: SmtpOverviewProps): JSX.Element | null {
  if (view === undefined && hasFailed) {
    return null
  }

  if (view === undefined) {
    return <Skeleton className="h-64 rounded-xl" />
  }

  if (view.is_custom === false) {
    return <SmtpStatusPanel view={view} />
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-3">
      <SmtpStatusPanel view={view} className="lg:col-span-2" />
      <SmtpTestSection projectId={projectId} />
    </div>
  )
}
