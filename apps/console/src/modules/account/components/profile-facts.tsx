import type { User } from '@nelcota/sdk'
import type { JSX } from 'react'

import { signInMethods } from '@/modules/users/components/sign-in-methods'
import { DataList, DataListItem } from '@/shared/ui/data-list'
import { IdChip } from '@/shared/ui/id-chip'
import { Timestamp } from '@/shared/ui/timestamp'

/**
 * The account's record: id, creation and how it signs in. The email is the card's heading and
 * the sessions tab shows the logins, so neither repeats here.
 */
export function ProfileFacts({ user }: { user: User }): JSX.Element {
  return (
    <DataList>
      <DataListItem label="ID da conta">
        <IdChip label="ID da conta" value={user.id} />
      </DataListItem>
      <DataListItem label="Criada em">
        <Timestamp value={user.created_at} />
      </DataListItem>
      <DataListItem label="Entra com">{signInMethods(user).join(' · ')}</DataListItem>
    </DataList>
  )
}
