import type { Session } from '@nelcota/sdk'
import type { JSX } from 'react'

import { AccountActions } from '../components/account-actions'
import { AvatarSection } from '../components/avatar-section'
import { Card } from '../components/card'
import { MfaSection } from '../components/mfa-section'
import { SessionsSection } from '../components/sessions-section'

type ProfilePageProps = { session: Session }

export function ProfilePage({ session }: ProfilePageProps): JSX.Element {
  const user = session.user

  return (
    <>
      <Card title={user.email}>
        <EmailStatus verifiedAt={user.email_verified_at} />
      </Card>
      <AvatarSection user={user} />
      <MfaSection />
      <SessionsSection />
      <AccountActions />
    </>
  )
}

type EmailStatusProps = { verifiedAt: string | null | undefined }

function EmailStatus({ verifiedAt }: EmailStatusProps): JSX.Element {
  if (verifiedAt === null || verifiedAt === undefined) {
    return <p>E-mail ainda não confirmado.</p>
  }

  return <p>E-mail confirmado.</p>
}
