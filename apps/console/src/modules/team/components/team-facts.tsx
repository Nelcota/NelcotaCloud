import type { JSX } from 'react'

import { useCurrentAccount } from '@/shared/auth/use-current-account'
import { IdChip } from '@/shared/ui/id-chip'

/** The ids the team endpoints take: the project and the signed-in account. */
export function TeamFacts({ projectId }: { projectId: string }): JSX.Element {
  const me = useCurrentAccount()

  return (
    <div className="flex flex-wrap gap-2">
      <IdChip label="ID do projeto" value={projectId} isLabelVisible />
      <AccountChip accountId={me.id} />
    </div>
  )
}

function AccountChip({ accountId }: { accountId: string }): JSX.Element | null {
  if (accountId === '') {
    return null
  }

  return <IdChip label="ID da sua conta" value={accountId} isLabelVisible />
}
