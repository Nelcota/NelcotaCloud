import type { JSX } from 'react'

import { SmtpStatusPanel } from '@/modules/project-settings/components/smtp-status-panel'
import { SmtpSummary } from '@/modules/project-settings/components/smtp-summary'
import { SmtpTestSection } from '@/modules/project-settings/components/smtp-test-section'
import type { components } from '@/shared/api/api-schema'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type SmtpSettingsView = components['schemas']['SmtpSettingsView']

type SmtpOverviewProps = {
  projectId: string
  /** `undefined` while loading. */
  view: SmtpSettingsView | undefined
  /** The load failed: the page shows the error and its retry, so this shows nothing. */
  hasFailed: boolean
}

/** Who sends the emails in one sentence, then the project's own server and its test send. */
export function SmtpOverview({
  projectId,
  view,
  hasFailed,
}: SmtpOverviewProps): JSX.Element | null {
  if (view === undefined && hasFailed) {
    return null
  }

  if (view === undefined) {
    return <Skeleton className="h-11 rounded-xl" />
  }

  return (
    <div className="flex flex-col gap-4">
      <SmtpSummary view={view} />
      <CustomServer projectId={projectId} view={view} />
    </div>
  )
}

/** Testing only makes sense, and is only allowed, for the project's own server. */
function CustomServer({
  projectId,
  view,
}: {
  projectId: string
  view: SmtpSettingsView
}): JSX.Element | null {
  if (view.is_custom === false) {
    return null
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <SmtpStatusPanel view={view} />
      <SmtpTestSection projectId={projectId} />
    </div>
  )
}
