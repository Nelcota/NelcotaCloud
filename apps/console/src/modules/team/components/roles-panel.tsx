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
      <table className="w-full text-sm">
        <thead className="bg-surface text-muted-foreground">
          <tr className="border-b">
            <th scope="col" className="h-10 px-4 text-left font-medium">
              <span className="sr-only">Permissão</span>
            </th>
            <th scope="col" className="w-16 px-2 text-center font-medium">
              Dono
            </th>
            <th scope="col" className="w-16 px-2 pe-4 text-center font-medium">
              Membro
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ABILITIES.map((ability) => (
            <tr key={ability.label}>
              <th scope="row" className="px-4 py-2.5 text-left font-normal">
                {ability.label}
              </th>
              <td className="px-2 text-center">
                <Allowed isAllowed />
              </td>
              <td className="px-2 pe-4 text-center">
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
    return <Check aria-label="Pode" className="mx-auto size-4 text-success" />
  }

  return (
    <span aria-label="Não pode" className="text-muted-foreground">
      —
    </span>
  )
}
