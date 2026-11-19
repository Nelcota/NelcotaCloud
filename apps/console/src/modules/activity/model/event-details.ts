/** The facts the server records about a change, as a list a person can read. */
export type DetailEntry = { label: string; value: string }

type Details = Readonly<Record<string, unknown>>

const FIELD_LABELS: Record<string, string> = {
  section: 'Área',
  operation: 'Operação',
  table: 'Tabela',
  column: 'Coluna',
  policy: 'Política',
  name: 'Nome',
  kind: 'Tipo',
  key_id: 'Chave',
  provider: 'Provedor',
  template: 'Modelo',
  role: 'Papel',
  account_id: 'Conta',
  email: 'E-mail',
  version: 'Versão',
  fields: 'Campos',
  rls_enabled: 'RLS',
  network: 'Endereço',
  note: 'Motivo',
}

const VALUE_WORDS: Record<string, string> = {
  project: 'Projeto',
  captcha: 'Captcha',
  smtp: 'SMTP',
  signing_key: 'Chave de assinatura',
  email_template: 'Modelo de e-mail',
  oauth_provider: 'Login social',
  create_table: 'Tabela criada',
  change_table: 'Tabela alterada',
  drop_table: 'Tabela excluída',
  add_column: 'Coluna adicionada',
  drop_column: 'Coluna excluída',
  create_policy: 'Política criada',
  drop_policy: 'Política excluída',
  remove: 'Removido',
  reset: 'Restaurado ao padrão',
  publishable: 'Publicável',
  secret: 'Secreta',
  owner: 'Dono',
  admin: 'Administrador',
  member: 'Membro',
  verification: 'Confirmação de e-mail',
  password_reset: 'Redefinição de senha',
  magic_link: 'Link mágico',
  name: 'Nome',
  site_url: 'URL do site',
  require_email_verification: 'Confirmação de e-mail obrigatória',
  mascot_id: 'Mascote',
}

/** What the change was about, for the row's title: a name, a table, an email or an area. */
const SUBJECT_FIELDS = ['name', 'table', 'email', 'provider', 'network', 'section'] as const

/** Each known fact in a fixed order; unknown fields are left out rather than shown raw. */
export function detailEntries(details: Details | null | undefined): DetailEntry[] {
  if (details === null || details === undefined) {
    return []
  }

  return Object.keys(FIELD_LABELS).flatMap((field) => entryOf(field, details[field]))
}

/** The one fact that names what changed, such as "App iOS" or "Modelo de e-mail". */
export function detailSubject(details: Details | null | undefined): string | null {
  if (details === null || details === undefined) {
    return null
  }

  for (const field of SUBJECT_FIELDS) {
    const text = valueText(details[field])

    if (text !== null) {
      return text
    }
  }

  return null
}

function entryOf(field: string, value: unknown): DetailEntry[] {
  const text = valueText(value)

  if (text === null) {
    return []
  }

  return [{ label: FIELD_LABELS[field] ?? field, value: text }]
}

function valueText(value: unknown): string | null {
  if (typeof value === 'string' && value !== '') {
    return VALUE_WORDS[value] ?? value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  if (typeof value === 'boolean') {
    return booleanText(value)
  }

  if (Array.isArray(value)) {
    return listText(value)
  }

  return null
}

function booleanText(value: boolean): string {
  if (value) {
    return 'Ligado'
  }

  return 'Desligado'
}

function listText(values: readonly unknown[]): string | null {
  const texts = values.flatMap((value) => valueText(value) ?? [])

  if (texts.length === 0) {
    return null
  }

  return texts.join(', ')
}
