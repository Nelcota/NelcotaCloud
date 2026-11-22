import type { User } from '@nelcota/sdk'
import type { JSX } from 'react'

import { DataList, DataListItem } from '@/shared/ui/data-list'
import { IdChip } from '@/shared/ui/id-chip'
import { Timestamp } from '@/shared/ui/timestamp'

/** The account's record as the API keeps it: id, sign-in methods and dates. */
export function ProfileFacts({ user }: { user: User }): JSX.Element {
  return (
    <DataList className="border-t px-6">
      <DataListItem label="ID da conta">
        <IdChip label="ID da conta" value={user.id} />
      </DataListItem>
      <DataListItem label="Email">{user.email}</DataListItem>
      <DataListItem label="Criada em">
        <Timestamp value={user.created_at} />
      </DataListItem>
      <DataListItem label="Último login">
        <OptionalTimestamp value={user.last_sign_in_at ?? null} />
      </DataListItem>
      <DataListItem label="Métodos de login">
        <SignInMethods hasPassword={user.has_password} providers={user.providers} />
      </DataListItem>
    </DataList>
  )
}

function OptionalTimestamp({ value }: { value: string | null }): JSX.Element {
  if (value === null) {
    return <span className="text-muted-foreground">—</span>
  }

  return <Timestamp value={value} />
}

type SignInMethodsProps = { hasPassword: boolean; providers: string[] }

function SignInMethods({ hasPassword, providers }: SignInMethodsProps): JSX.Element {
  const methods = [...passwordMethod(hasPassword), ...providers]

  if (methods.length === 0) {
    return <span className="text-muted-foreground">Link por email</span>
  }

  return <span className="font-mono text-xs">{methods.join(' · ')}</span>
}

function passwordMethod(hasPassword: boolean): string[] {
  if (hasPassword) {
    return ['password']
  }

  return []
}
