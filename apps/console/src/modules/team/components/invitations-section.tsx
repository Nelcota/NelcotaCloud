import type { JSX } from 'react'

import { InvitationList, type InvitationListProps } from '@/modules/team/components/invitation-list'
import { Section } from '@/shared/ui/section'

/** Shown only while someone has not answered (or the search still matches one). */
export function InvitationsSection(props: InvitationListProps): JSX.Element | null {
  if (props.rows.length === 0) {
    return null
  }

  return (
    <Section
      title="Convites pendentes"
      description="Entram como membro ao aceitar no console."
      meta={props.rows.length}
      isFramed
    >
      <InvitationList {...props} />
    </Section>
  )
}
