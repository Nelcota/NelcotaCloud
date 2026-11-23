import type { Session } from '@nelcota/sdk'
import type { JSX } from 'react'

import { AccountTabPanel } from '@/modules/account/components/account-tab-panel'
import { ACCOUNT_TABS, useAccountTab } from '@/modules/account/components/account-tabs'
import { MfaSection } from '@/modules/account/components/mfa-section'
import { PasswordSection } from '@/modules/account/components/password-section'
import { ProfileSection } from '@/modules/account/components/profile-section'
import { SessionsSection } from '@/modules/account/components/sessions-section'
import { useSession } from '@/shared/auth/use-session'
import { PageHeader } from '@/shared/ui/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

/** The console account itself: who it is, how it is protected and where it is signed in. */
export function AccountPage(): JSX.Element {
  const session = useSession()
  const { tab, select } = useAccountTab()

  return (
    <Tabs value={tab} onValueChange={select} className="mx-auto w-full max-w-4xl gap-5">
      <PageHeader title="Minha conta">
        <TabsList variant="line" aria-label="Seções da conta" className="w-full">
          {ACCOUNT_TABS.map((accountTab) => (
            <TabsTrigger key={accountTab.id} value={accountTab.id}>
              {accountTab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </PageHeader>
      <AccountTabPanel value="perfil">
        <ProfilePanels session={session} />
      </AccountTabPanel>
      <AccountTabPanel value="seguranca">
        <MfaSection />
        <PasswordPanel session={session} />
      </AccountTabPanel>
      <AccountTabPanel value="sessoes">
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
