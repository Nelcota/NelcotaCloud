import type { Session } from '@nelcota/sdk'
import type { JSX } from 'react'

import { AccountTabPanel } from '@/modules/account/components/account-tab-panel'
import { MfaSection } from '@/modules/account/components/mfa-section'
import { PasswordSection } from '@/modules/account/components/password-section'
import { ProfileSection } from '@/modules/account/components/profile-section'
import { SessionsSection } from '@/modules/account/components/sessions-section'
import { useSession } from '@/shared/auth/use-session'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { PageHeader } from '@/shared/ui/page-header'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

/** Wide screens list the tabs in a column beside the panels, like the project settings. */
const WIDE_QUERY = '(min-width: 1024px)'

/** On wide screens the tabs look like the settings' section list: a quiet pill, no underline. */
const VERTICAL_TRIGGER =
  'flex-none px-2.5 lg:h-10 lg:text-sm lg:font-normal lg:after:hidden lg:hover:bg-surface-hover lg:data-active:border-transparent! lg:data-active:bg-surface! lg:data-active:font-medium lg:data-active:text-heading'

const TABS = [
  { value: 'profile', label: 'Perfil' },
  { value: 'security', label: 'Segurança' },
  { value: 'sessions', label: 'Sessões' },
]

/** The console account itself: who it is, how it is protected and where it is signed in. */
export function AccountPage(): JSX.Element {
  const session = useSession()
  const orientation = tabsOrientation(useMediaQuery(WIDE_QUERY))

  return (
    <div className="mx-auto flex w-full max-w-[62.5rem] flex-col gap-8">
      <PageHeader title="Minha conta" description="A conta com que você entra no console." />
      <Tabs
        defaultValue="profile"
        orientation={orientation}
        className="gap-6 lg:grid lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-8"
      >
        <TabsList
          variant="line"
          aria-label="Seções da conta"
          className="w-full justify-start border-b pb-1 lg:sticky lg:top-4 lg:items-stretch lg:gap-0.5 lg:self-start lg:border-b-0 lg:p-0"
        >
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className={VERTICAL_TRIGGER}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
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
    </div>
  )
}

function tabsOrientation(isWide: boolean): 'horizontal' | 'vertical' {
  if (isWide) {
    return 'vertical'
  }

  return 'horizontal'
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
