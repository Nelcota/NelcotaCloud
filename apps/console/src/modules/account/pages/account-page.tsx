import type { Session } from '@nelcota/sdk'
import type { JSX } from 'react'

import { MfaSection } from '@/modules/account/components/mfa-section'
import { ProfilePhotoSection } from '@/modules/account/components/profile-photo-section'
import { SessionsSection } from '@/modules/account/components/sessions-section'
import { useSession } from '@/shared/auth/use-session'
import { PageHeader } from '@/shared/ui/page-header'

/** The console account itself: how it is protected and where it is signed in. */
export function AccountPage(): JSX.Element {
  const session = useSession()

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader title="Minha conta" description={session?.user.email} />
      <AccountPhoto session={session} />
      <MfaSection />
      <SessionsSection />
    </div>
  )
}

function AccountPhoto({ session }: { session: Session | null }): JSX.Element | null {
  if (session === null) {
    return null
  }

  return <ProfilePhotoSection session={session} />
}
