import { activeKeys } from '@/modules/api-keys/components/key-activity'
import { countText, namesOf } from '@/modules/overview/components/insight-text'
import type { Insight, InsightSources } from '@/modules/overview/components/insight-types'
/** Refusals from one address worth a look: below this, typos explain them. */
export const CONCENTRATED_FAILURES = 5

export function rlsRule({ schema }: InsightSources, base: string): Insight | null {
  const open = (schema?.tables ?? []).filter(
    (table) => table.kind === 'table' && table.rls_enabled === false,
  )

  if (open.length === 0) {
    return null
  }

  return {
    id: 'rls-off',
    severity: 'warning',
    title: 'Ative o RLS nas tabelas',
    text: `${countText(open.length, 'tabela', 'tabelas')} sem RLS: ${namesOf(open)}.`,
    action: { label: 'Revisar', to: `${base}/database` },
  }
}

export function closedTablesRule({ schema }: InsightSources, base: string): Insight | null {
  const closed = (schema?.tables ?? []).filter(
    (table) => table.kind === 'table' && table.rls_enabled && table.policies.length === 0,
  )

  if (closed.length === 0) {
    return null
  }

  return {
    id: 'rls-no-policies',
    severity: 'info',
    title: 'Crie políticas para as tabelas',
    text: `${countText(closed.length, 'tabela', 'tabelas')} com RLS e nenhuma política, fechadas para o app: ${namesOf(closed)}.`,
    action: { label: 'Criar política', to: `${base}/database` },
  }
}

export function concentratedFailuresRule(
  { summary }: InsightSources,
  base: string,
): Insight | null {
  const top = summary?.failing_addresses[0]

  if (top === undefined || top.failures < CONCENTRATED_FAILURES) {
    return null
  }

  return {
    id: 'failing-address',
    severity: 'warning',
    title: 'Confira os logins recusados',
    text: `${countText(top.failures, 'login recusado veio', 'logins recusados vieram')} de ${top.ip_address}, em ${countText(top.accounts, 'conta', 'contas')}.`,
    action: { label: 'Ver atividade', to: `${base}/activity` },
  }
}

export function publishableKeyRule({ keys }: InsightSources, base: string): Insight | null {
  if (keys === undefined || activeKeys(keys).some((key) => key.kind === 'publishable')) {
    return null
  }

  return {
    id: 'no-publishable-key',
    severity: 'warning',
    title: 'Crie uma chave publicável',
    text: 'Nenhuma chave publicável ativa: o app não tem como chamar a API.',
    action: { label: 'Criar chave', to: `${base}/keys` },
  }
}

export function unusedKeysRule({ keys }: InsightSources, base: string): Insight | null {
  const active = activeKeys(keys ?? [])

  if (active.length === 0 || active.some((key) => typeof key.last_used_at === 'string')) {
    return null
  }

  return {
    id: 'keys-unused',
    severity: 'info',
    title: 'Conecte o app à API',
    text: 'Nenhuma chave foi usada ainda: o app ainda não chamou a API.',
    action: { label: 'Ver chaves', to: `${base}/keys` },
  }
}
