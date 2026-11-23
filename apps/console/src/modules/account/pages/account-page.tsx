import type { Session } from '@nelcota/sdk'
import type { JSX } from 'react'

import { AccountTabPanel } from '@/modules/account/components/account-tab-panel'
import { MfaSection } from '@/modules/account/components/mfa-section'
import { PasswordSection } from '@/modules/account/components/password-section'
import { ProfileSection } from '@/modules/account/components/profile-section'
import { SessionsSection } from '@/modules/account/components/sessions-section'
import { useSession } from '@/shared/auth/use-session'
import { PageHeader } from '@/shared/ui/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

const TABS = [
  { value: 'profile', label: 'Perfil' },
  { value: 'security', label: 'Segurança' },
  { value: 'sessions', label: 'Sessões' },
]

/** The console account itself: who it is, how it is protected and where it is signed in. */
export function AccountPage(): JSX.Element {
  const session = useSession()

  return (
    <Tabs defaultValue="profile" className="mx-auto w-full max-w-4xl gap-5">
      <PageHeader title="Minha conta">
        <TabsList variant="line" aria-label="Seções da conta" className="w-full">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </PageHeader>
      <AccountTabPanel value="profile">
        <ProfilePanels session={session} />
      </AccountTabPanel>
      <AccountTabPanel value="security">
        <MfaSection />
        <PasswordPanel session={session} />
      </AccountTabPanel>
      <AccountTabPanel value="sessions">
        <SessionsSection />
      </AccountTabPanel>
    </Tabs>
  )
}

function ProfilePanels({ session }: { session: Session | null }): JSX.Element | null {
  if (session === null) {
    return null
  }

  return <ProfileSection session={session} />
}

function PasswordPanel({ session }: { session: Session | null }): JSX.Element | null {
  if (session === null) {
    return null
  }

  return <PasswordSection email={session.user.email} />
}
