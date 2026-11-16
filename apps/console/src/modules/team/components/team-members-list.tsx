import type { JSX } from 'react'

import { useRemoveMemberMutation } from '@/modules/team/queries/use-team'
import type { components } from '@/shared/api/api-schema'
import { formatDate } from '@/shared/lib/format-date'
import { Badge } from '@/shared/ui/badge'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SettingsSection } from '@/shared/ui/settings-section'

type TeamMember = components['schemas']['TeamMember']

type TeamMembersListProps = {
  projectId: string
  members: TeamMember[]
  canManage: boolean
}

/** The console accounts with access to the project, owners first. */
export function TeamMembersList(props: TeamMembersListProps): JSX.Element {
  const removal = useRemoveMemberMutation(props.projectId)

  return (
    <SettingsSection title="Membros" description="Contas do console com acesso a este projeto.">
      <ErrorAlert error={removal.error} />
      <ul className="divide-y rounded-lg border">
        {props.members.map((member) => (
          <li key={member.account_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <MemberAvatar email={member.email} />
            <div className="min-w-0 flex-1">
              <MemberEmail email={member.email} />
              <p className="text-muted-foreground text-xs">Desde {formatDate(member.joined_at)}</p>
            </div>
            <RoleBadge role={member.role} />
            <RemoveAction
              member={member}
              canManage={props.canManage}
              isPending={removal.isPending && removal.variables === member.account_id}
              onRemove={() => removal.mutate(member.account_id)}
            />
          </li>
        ))}
      </ul>
    </SettingsSection>
  )
}

function MemberAvatar({ email }: { email: string }): JSX.Element {
  const initials = email.split('@')[0]?.slice(0, 2).toUpperCase() ?? ''

  return (
    <span
      aria-hidden="true"
      className="bg-secondary text-secondary-foreground flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
    >
      {initials}
    </span>
  )
}

/** The email is recorded on the member's next console visit; until then it is unknown. */
function MemberEmail({ email }: { email: string }): JSX.Element {
  if (email === '') {
    return <p className="text-muted-foreground text-sm italic">Email aparece no próximo acesso</p>
  }

  return <p className="truncate text-sm font-medium">{email}</p>
}

function RoleBadge({ role }: { role: TeamMember['role'] }): JSX.Element {
  if (role === 'owner') {
    return <Badge variant="secondary">Dono</Badge>
  }

  return <Badge variant="outline">Membro</Badge>
}

type RemoveActionProps = {
  member: TeamMember
  canManage: boolean
  isPending: boolean
  onRemove: () => void
}

/** Owners remove members; owners themselves stay, so a project never loses its owner. */
function RemoveAction(props: RemoveActionProps): JSX.Element | null {
  if (props.canManage === false || props.member.role === 'owner') {
    return null
  }

  return (
    <ConfirmButton
      title={`Remover ${memberLabel(props.member.email)}?`}
      description="A pessoa perde o acesso ao projeto na hora. Para voltar, precisa de um novo convite."
      confirmLabel="Remover"
      isDestructive
      isPending={props.isPending}
      onConfirm={props.onRemove}
    >
      Remover
    </ConfirmButton>
  )
}

function memberLabel(email: string): string {
  if (email === '') {
    return 'este membro'
  }

  return email
}
