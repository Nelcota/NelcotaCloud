import type { JSX } from 'react'

import { ResetSmtpButton } from '@/modules/project-settings/components/reset-smtp-button'
import { serverNameOf } from '@/modules/project-settings/components/smtp-server-name'
import { SmtpSetupDialog } from '@/modules/project-settings/components/smtp-setup-dialog'
import type { components } from '@/shared/api/api-schema'

type SmtpSettingsView = components['schemas']['SmtpSettingsView']

const TRIGGER_LABELS = { custom: 'Trocar servidor', platform: 'Configurar SMTP' } as const

/** Back to the platform's server, and the page's main action: setting up the project's own. */
export function SmtpHeaderActions({
  projectId,
  view,
}: {
  projectId: string
  /** `undefined` while loading. */
  view: SmtpSettingsView | undefined
}): JSX.Element | null {
  if (view === undefined) {
    return null
  }

  // Both keep their places in either state, so saving does not unmount the open dialog.
  return (
    <>
      <ResetSlot projectId={projectId} view={view} />
      <SmtpSetupDialog
        projectId={projectId}
        triggerLabel={TRIGGER_LABELS[sourceOf(view)]}
        triggerVariant="default"
      />
    </>
  )
}

function sourceOf(view: SmtpSettingsView): keyof typeof TRIGGER_LABELS {
  if (view.is_custom) {
    return 'custom'
  }

  return 'platform'
}

function ResetSlot({
  projectId,
  view,
}: {
  projectId: string
  view: SmtpSettingsView
}): JSX.Element | null {
  if (view.is_custom === false) {
    return null
  }

  return <ResetSmtpButton projectId={projectId} serverName={serverNameOf(view)} />
}
