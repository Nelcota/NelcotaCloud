import type { JSX } from 'react'

import type { MemberRow } from '@/modules/team/components/team-rows'
import { Avatar } from '@/shared/ui/avatar'

type MemberIdentityProps = { row: MemberRow; isOwnRow: boolean; myPhotoUrl: string | null }

/** Photo, email and the account id the team endpoints take, in one cell. */
export function MemberIdentity({ row, isOwnRow, myPhotoUrl }: MemberIdentityProps): JSX.Element {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={row.email} src={photoOf(isOwnRow, myPhotoUrl)} size="sm" />
      <span className="grid min-w-0 gap-0.5">
        <span className="flex min-w-0 items-baseline gap-1.5">
          <KnownEmail email={row.email} />
          {isOwnRow && <span className="shrink-0 text-muted-foreground">(você)</span>}
        </span>
        <code title={row.id} className="truncate font-mono text-2xs text-muted-foreground">
          <span className="sr-only">ID da conta </span>
          {row.id}
        </code>
      </span>
    </div>
  )
}

/** The email of a member is recorded on their next console visit; until then it is unknown. */
function KnownEmail({ email }: { email: string }): JSX.Element {
  if (email === '') {
    return <span className="truncate text-muted-foreground">Email ainda desconhecido</span>
  }

  return (
    <span className="truncate font-medium text-foreground" title={email}>
      {email}
    </span>
  )
}

function photoOf(isOwnRow: boolean, myPhotoUrl: string | null): string | undefined {
  if (isOwnRow && myPhotoUrl !== null) {
    return myPhotoUrl
  }

  return undefined
}
