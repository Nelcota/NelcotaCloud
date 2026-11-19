import type { JSX, ReactNode } from 'react'
import { useId } from 'react'

import { ConfirmedActionButton } from '@/modules/users/components/confirmed-action-button'
import { DetailRow } from '@/modules/users/components/detail-row'
import type { UserActionProps } from '@/modules/users/components/user-action-props'
import { UserEmailRow } from '@/modules/users/components/user-email-row'
import { UserIdentitiesRow } from '@/modules/users/components/user-identities-row'
import { confirmationSubjectOf } from '@/modules/users/model/account-state'
import { formatDateTime } from '@/shared/lib/format-date'
import { CopyButton } from '@/shared/ui/copy-button'

type UserFactsPanelProps = UserActionProps & { projectId: string }

/**
 * The account's details beside the page, in two short groups: how the user gets in (email, MFA,
 * social logins, a block) and the ID to find them by. State, last login and creation are in the
 * header, so nothing here repeats it.
 */
export function UserFactsPanel(props: UserFactsPanelProps): JSX.Element {
  const { user, projectId } = props

  return (
    <div className="surface overflow-hidden">
      <FactsGroup title="Acesso">
        <UserEmailRow user={user} projectId={projectId} />
        <PasswordRow {...props} />
        <AccessRow {...props} />
        <MfaRow {...props} />
        <UserIdentitiesRow projectId={projectId} userId={user.id} />
      </FactsGroup>
      <FactsGroup title="Identificação">
        <DetailRow
          label="ID do usuário"
          action={<CopyButton value={user.id} description="o ID do usuário" isCompact />}
        >
          <code title={user.id} className="font-mono text-xs font-normal">
            {shortId(user.id)}
          </code>
        </DetailRow>
      </FactsGroup>
    </div>
  )
}

type FactsGroupProps = { title: string; children: ReactNode }

/** A titled list of facts; groups are split by a hairline, rows inside by a fainter one. */
function FactsGroup({ title, children }: FactsGroupProps): JSX.Element {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="border-t first:border-t-0">
      <h2 id={headingId} className="text-muted-foreground px-4 pt-4 pb-1 text-xs font-semibold">
        {title}
      </h2>
      <dl className="divide-border/60 divide-y">{children}</dl>
    </section>
  )
}

/** A passwordless account gets in only by email link or a social login. */
function PasswordRow({ user }: UserActionProps): JSX.Element {
  if (user.has_password) {
    return <DetailRow label="Senha">Definida</DetailRow>
  }

  return (
    <DetailRow label="Senha">
      <span className="text-muted-foreground font-normal">Sem senha</span>
    </DetailRow>
  )
}

/** Shown only for a block, with its date; a working account says so in the header. */
function AccessRow({ user }: UserActionProps): JSX.Element | null {
  const bannedAt = user.banned_at

  if (bannedAt === null || bannedAt === undefined) {
    return null
  }

  return <DetailRow label="Bloqueado em">{formatDateTime(bannedAt)}</DetailRow>
}

/** Removing MFA is rare (a lost phone), so it sits with the fact instead of in the header. */
function MfaRow({ user, pendingAction, onAction }: UserActionProps): JSX.Element {
  if (user.mfa_enabled === false) {
    return (
      <DetailRow label="MFA">
        <span className="text-muted-foreground font-normal">Desativado</span>
      </DetailRow>
    )
  }

  const reset = (
    <ConfirmedActionButton
      action="reset-mfa"
      subject={confirmationSubjectOf(user)}
      isPending={pendingAction === 'reset-mfa'}
      onConfirm={() => onAction('reset-mfa')}
    />
  )

  return (
    <DetailRow label="MFA" action={reset}>
      Ativado
    </DetailRow>
  )
}

/** Long IDs are shown by their ends ("62f80618…bcda56"); Copy and the tooltip give the whole. */
const ID_HEAD = 8
const ID_TAIL = 6

function shortId(id: string): string {
  if (id.length <= ID_HEAD + ID_TAIL + 1) {
    return id
  }

  return `${id.slice(0, ID_HEAD)}…${id.slice(-ID_TAIL)}`
}
