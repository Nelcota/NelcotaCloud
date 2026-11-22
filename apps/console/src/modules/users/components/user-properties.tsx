import type { JSX } from 'react'

import { signInMethods } from '@/modules/users/components/sign-in-methods'
import { OptionalDate, UserEmailFact } from '@/modules/users/components/user-property-values'
import type { components } from '@/shared/api/api-schema'
import { DataList, DataListItem } from '@/shared/ui/data-list'
import { IdChip } from '@/shared/ui/id-chip'
import { Section } from '@/shared/ui/section'
import { Timestamp } from '@/shared/ui/timestamp'

type User = components['schemas']['User']

/** Every field the API returns about the account, as label and value rows. */
export function UserProperties({ user }: { user: User }): JSX.Element {
  return (
    <Section title="Conta" isFramed>
      <DataList className="px-4">
        <DataListItem label="ID">
          <IdChip label="ID do usuário" value={user.id} />
        </DataListItem>
        <DataListItem label="Email">
          <UserEmailFact user={user} />
        </DataListItem>
        <DataListItem label="Criado em">
          <Timestamp value={user.created_at} />
        </DataListItem>
        <DataListItem label="Último login">
          <OptionalDate value={user.last_sign_in_at} missing="Nunca entrou" />
        </DataListItem>
        <DataListItem label="Entra com">{signInMethods(user).join(' · ')}</DataListItem>
        <DataListItem label="Senha">{passwordText(user)}</DataListItem>
        <DataListItem label="MFA">{mfaText(user)}</DataListItem>
        <DataListItem label="Foto atualizada em">
          <OptionalDate value={user.avatar_updated_at} missing="Sem foto" />
        </DataListItem>
        <DataListItem label="Bloqueado em">
          <OptionalDate value={user.banned_at} missing="Não bloqueado" />
        </DataListItem>
      </DataList>
    </Section>
  )
}

function passwordText(user: User): string {
  if (user.has_password) {
    return 'Definida'
  }

  return 'Sem senha'
}

function mfaText(user: User): string {
  if (user.mfa_enabled) {
    return 'Autenticador TOTP ativado'
  }

  return 'Desativado'
}
