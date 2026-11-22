import { Check } from 'lucide-react'
import type { JSX } from 'react'

import { Section } from '@/shared/ui/section'

/** Who may do it: owners may do everything, members most, viewers only look. */
type Reach = 'everyone' | 'members' | 'owners'

type Ability = { label: string; reach: Reach }

const ABILITIES: Ability[] = [
  { label: 'Ver tudo', reach: 'everyone' },
  { label: 'Mudar dados e ajustes', reach: 'members' },
  { label: 'SQL e webhooks', reach: 'members' },
  { label: 'Convidar e remover', reach: 'owners' },
  { label: 'Mudar papéis', reach: 'owners' },
  { label: 'Transferir e excluir', reach: 'owners' },
]

const ROLES: { label: string; reaches: readonly Reach[] }[] = [
  { label: 'Dono', reaches: ['everyone', 'members', 'owners'] },
  { label: 'Membro', reaches: ['everyone', 'members'] },
  { label: 'Leitura', reaches: ['everyone'] },
]

/** What each role can do side by side, in view while deciding who to invite or promote. */
export function RolesPanel(): JSX.Element {
  return (
    <Section title="Papéis" isFramed>
      <table className="w-full text-xs">
        <thead className="text-2xs text-muted-foreground">
          <tr className="border-b border-border/60">
            <th scope="col" className="h-9 ps-4 text-start font-normal">
              <span className="sr-only">Permissão</span>
            </th>
            {ROLES.map((role) => (
              <th key={role.label} scope="col" className="w-14 text-center font-normal last:pe-2">
                {role.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {ABILITIES.map((ability) => (
            <tr key={ability.label}>
              <th scope="row" className="py-2 ps-4 text-start font-normal text-foreground">
                {ability.label}
              </th>
              {ROLES.map((role) => (
                <td key={role.label} className="text-center last:pe-2">
                  <Allowed isAllowed={role.reaches.includes(ability.reach)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  )
}

function Allowed({ isAllowed }: { isAllowed: boolean }): JSX.Element {
  if (isAllowed) {
    return <Check aria-label="Pode" className="mx-auto size-4 text-success" />
  }

  return (
    <span className="text-muted-foreground">
      <span className="sr-only">Não pode</span>
      <span aria-hidden>—</span>
    </span>
  )
}
