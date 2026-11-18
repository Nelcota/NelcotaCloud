import type { components } from '@/shared/api/api-schema'

type CreatePolicyRequest = components['schemas']['CreatePolicyRequest']

export type PolicyCommand = 'all' | 'select' | 'insert' | 'update' | 'delete'

export type PolicyRole = 'anon' | 'authenticated'

/** A policy being written in the form. */
export type PolicyDraft = {
  name: string
  command: PolicyCommand
  roles: PolicyRole[]
  using: string
  withCheck: string
}

export const COMMAND_OPTIONS: readonly { value: PolicyCommand; label: string }[] = [
  { value: 'all', label: 'Todos os comandos' },
  { value: 'select', label: 'Ler (SELECT)' },
  { value: 'insert', label: 'Inserir (INSERT)' },
  { value: 'update', label: 'Alterar (UPDATE)' },
  { value: 'delete', label: 'Excluir (DELETE)' },
]

export const ROLE_OPTIONS: readonly { value: PolicyRole; label: string }[] = [
  { value: 'anon', label: 'Visitantes (anon)' },
  { value: 'authenticated', label: 'Usuários logados (authenticated)' },
]

export const BLANK_POLICY: PolicyDraft = {
  name: '',
  command: 'select',
  roles: ['authenticated'],
  using: '',
  withCheck: '',
}

/** INSERT has no existing rows to filter. */
export function hasUsing(command: PolicyCommand): boolean {
  return command !== 'insert'
}

/** SELECT and DELETE write nothing to check. */
export function hasWithCheck(command: PolicyCommand): boolean {
  return command !== 'select' && command !== 'delete'
}

export function isPolicyCommand(value: string): value is PolicyCommand {
  return COMMAND_OPTIONS.some((option) => option.value === value)
}

export function commandLabel(command: string): string {
  return COMMAND_OPTIONS.find((option) => option.value === command)?.label ?? command
}

export function toPolicyRequest(draft: PolicyDraft): CreatePolicyRequest {
  return {
    name: draft.name.trim(),
    command: draft.command,
    roles: draft.roles,
    using: conditionOf(hasUsing(draft.command), draft.using),
    with_check: conditionOf(hasWithCheck(draft.command), draft.withCheck),
  }
}

function conditionOf(isApplicable: boolean, text: string): string | null {
  const condition = text.trim()

  if (isApplicable === false || condition === '') {
    return null
  }

  return condition
}
