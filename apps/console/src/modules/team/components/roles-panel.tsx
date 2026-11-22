import { Check } from 'lucide-react'
import type { JSX } from 'react'

import { Section } from '@/shared/ui/section'

type Ability = { label: string; isOwnerOnly: boolean }

const ABILITIES: Ability[] = [
  { label: 'Usuários e atividade', isOwnerOnly: false },
  { label: 'Todas as chaves de API', isOwnerOnly: false },
  { label: 'Chave de assinatura', isOwnerOnly: false },
  { label: 'Webhooks, banco e ajustes', isOwnerOnly: false },
  { label: 'Convidar e remover pessoas', isOwnerOnly: true },
  { label: 'Mudar papéis', isOwnerOnly: true },
  { label: 'Transferir e excluir', isOwnerOnly: true },
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
            <th scope="col" className="w-14 text-center font-normal">
              Dono
            </th>
            <th scope="col" className="w-16 pe-2 text-center font-normal">
              Membro
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {ABILITIES.map((ability) => (
            <tr key={ability.label}>
              <th scope="row" className="py-2 ps-4 text-start font-normal text-foreground">
                {ability.label}
              </th>
              <td className="text-center">
                <Allowed isAllowed />
              </td>
              <td className="pe-2 text-center">
                <Allowed isAllowed={ability.isOwnerOnly === false} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  )
}

function Allowed({ isAllowed }: { isAllowed: boolean }): JSX.Element {
  if (isAllowed) {
    return <Check aria-label="Pode" className="mx-auto size-3.5 text-success" />
  }

  return (
    <span className="text-muted-foreground">
      <span className="sr-only">Não pode</span>
      <span aria-hidden>—</span>
    </span>
  )
}
