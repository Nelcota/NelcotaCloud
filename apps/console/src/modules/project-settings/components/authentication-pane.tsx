import type { JSX } from 'react'

import { EmailVerificationForm } from '@/modules/project-settings/components/email-verification-form'
import { LoginMethodsGroup } from '@/modules/project-settings/components/login-methods-group'
import type { components } from '@/shared/api/api-schema'

type AuthenticationPaneProps = {
  projectId: string
  settings: components['schemas']['TenantSettings']
}

export function AuthenticationPane({ projectId, settings }: AuthenticationPaneProps): JSX.Element {
  return (
    <>
      <EmailVerificationForm key={projectId} projectId={projectId} settings={settings} />
      <LoginMethodsGroup projectId={projectId} />
    </>
  )
}
