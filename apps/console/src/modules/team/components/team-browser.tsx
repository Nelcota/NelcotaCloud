import SearchX from '~icons/solar/magnifier-close-linear'
import type { JSX, ReactNode } from 'react'
import { useState } from 'react'

import { InvitationsTable } from '@/modules/team/components/invitations-table'
import { RoleSummary } from '@/modules/team/components/role-summary'
import { TeamTable } from '@/modules/team/components/team-table'
import {
  SEARCH_THRESHOLD,
  invitationRows,
  matchesSearch,
  memberRows,
  ownerCount,
} from '@/modules/team/components/team-rows'
import { useTeamActions } from '@/modules/team/components/use-team-actions'
import type { components } from '@/shared/api/api-schema'
import { type CurrentAccount, useCurrentAccount } from '@/shared/auth/use-current-account'
import { EmptyState } from '@/shared/ui/empty-state'
import { SearchInput } from '@/shared/ui/search-input'

type TeamView = components['schemas']['TeamView']

type TeamBrowserProps = { projectId: string; team: TeamView }

/** Who has access, then who is invited; a search appears only once the team is large. */
export function TeamBrowser({ projectId, team }: TeamBrowserProps): JSX.Element {
  const [search, setSearch] = useState('')
  const actions = useTeamActions(projectId)
  const me = useCurrentAccount()
  const members = memberRows(team).filter((row) => matchesSearch(row.email, search))
  const invitations = invitationRows(team).filter((row) => matchesSearch(row.email, search))

  return (
    <div className="grid gap-8">
      <MemberNote canManage={team.can_manage} />
      <RoleSummary />
      <SearchField
        isShown={team.members.length + team.invitations.length > SEARCH_THRESHOLD}
        value={search}
        onChange={setSearch}
      />
      <Section title="Pessoas com acesso" count={members.length}>
        <MembersResult
          members={members}
          table={{
            me,
            canManage: team.can_manage,
            ownerCount: ownerCount(team),
            memberCount: team.members.length,
          }}
          onAction={actions.runMember}
        />
      </Section>
      <LoneOwnerHint
        isShown={team.can_manage && team.members.length === 1 && team.invitations.length === 0}
      />
      <InvitationsSection
        rows={invitations}
        canManage={team.can_manage}
        onCancel={actions.cancelInvitation}
      />
    </div>
  )
}

type MembersResultProps = {
  members: ReturnType<typeof memberRows>
  table: { me: CurrentAccount; canManage: boolean; ownerCount: number; memberCount: number }
  onAction: Parameters<typeof TeamTable>[0]['onAction']
}

function MembersResult({ members, table, onAction }: MembersResultProps): JSX.Element {
  if (members.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="Ninguém encontrado"
        description="Ninguém com acesso tem um email que combine com a busca."
      />
    )
  }

  return <TeamTable rows={members} {...table} onAction={onAction} />
}

type InvitationsSectionProps = Parameters<typeof InvitationsTable>[0]

/** Shown only while someone has not answered. */
function InvitationsSection(props: InvitationsSectionProps): JSX.Element | null {
  if (props.rows.length === 0) {
    return null
  }

  return (
    <Section title="Convites pendentes" count={props.rows.length}>
      <InvitationsTable {...props} />
    </Section>
  )
}

type SectionProps = { title: string; count: number; children: ReactNode }

function Section({ title, count, children }: SectionProps): JSX.Element {
  return (
    <section className="grid gap-3">
      <h2 className="flex items-baseline gap-2 text-base font-semibold">
        {title}
        <span className="text-muted-foreground text-sm font-normal tabular-nums">{count}</span>
      </h2>
      {children}
    </section>
  )
}

type SearchFieldProps = { isShown: boolean; value: string; onChange: (value: string) => void }

function SearchField({ isShown, value, onChange }: SearchFieldProps): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return <SearchInput label="Buscar por email" value={value} onChange={onChange} />
}

/** Members see why the team cannot be changed from here, before reading the table. */
function MemberNote({ canManage }: { canManage: boolean }): JSX.Element | null {
  if (canManage) {
    return null
  }

  return (
    <p className="text-muted-foreground surface px-4 py-3 text-sm">
      Você é membro deste projeto: só donos convidam, removem pessoas e mudam papéis. Para sair, use
      o menu ⋯ na sua linha.
    </p>
  )
}

/** One person holding a project is a risk: the next step is someone to share it with. */
function LoneOwnerHint({ isShown }: { isShown: boolean }): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return (
    <p className="text-muted-foreground -mt-5 text-sm">
      Só você tem acesso a este projeto. Use Convidar pessoa para não depender de uma conta só.
    </p>
  )
}
