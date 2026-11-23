import { SearchX } from 'lucide-react'
import type { JSX } from 'react'

import { MemberList, type MemberListProps } from '@/modules/team/components/member-list'
import { TeamNotes } from '@/modules/team/components/team-notes'
import { SEARCH_THRESHOLD, type MemberRow, ownerCount } from '@/modules/team/components/team-rows'
import type { components } from '@/shared/api/api-schema'
import type { CurrentAccount } from '@/shared/auth/use-current-account'
import { EmptyState } from '@/shared/ui/empty-state'
import { SearchField } from '@/shared/ui/search-field'
import { Section } from '@/shared/ui/section'

type TeamView = components['schemas']['TeamView']

type SearchState = { value: string; onChange: (value: string) => void }

type MembersSectionProps = {
  team: TeamView
  /** The members that match the search, owners first. */
  rows: MemberRow[]
  me: CurrentAccount
  search: SearchState
  onAction: MemberListProps['onAction']
}

/** Who has access, as framed rows; a search joins once the team no longer fits. */
export function MembersSection(props: MembersSectionProps): JSX.Element {
  const { team, search } = props

  return (
    <Section
      title="Membros"
      meta={props.rows.length}
      action={<SearchBar team={team} search={search} />}
      isFramed
    >
      <MembersBody {...props} />
      <TeamNotes team={team} />
    </Section>
  )
}

function MembersBody({ team, rows, me, onAction }: MembersSectionProps): JSX.Element {
  if (rows.length === 0) {
    return <EmptyState isCompact icon={<SearchX aria-hidden />} title="Ninguém encontrado" />
  }

  return (
    <MemberList
      rows={rows}
      me={me}
      canManage={team.can_manage}
      ownerCount={ownerCount(team)}
      memberCount={team.members.length}
      onAction={onAction}
    />
  )
}

/** Small teams read at a glance; the search stays while it filters something. */
function SearchBar(props: { team: TeamView; search: SearchState }): JSX.Element | null {
  const { team, search } = props

  if (
    search.value.trim() === '' &&
    team.members.length + team.invitations.length <= SEARCH_THRESHOLD
  ) {
    return null
  }

  return (
    <SearchField
      label="Buscar por email"
      value={props.search.value}
      onValueChange={props.search.onChange}
    />
  )
}
