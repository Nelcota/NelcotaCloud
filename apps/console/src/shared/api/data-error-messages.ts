/**
 * Data API refusals that name the constraint or column that failed: the name is lifted from the
 * English text so people learn what to change, not only that something did.
 */
type NamedMessage = { pattern: RegExp; named: (name: string) => string; unnamed: string }

const CONSTRAINT_NAME = /constraint ([^\s)]+)\)?$/

const NAMED_MESSAGES: Record<string, NamedMessage> = {
  unique_violation: {
    pattern: CONSTRAINT_NAME,
    named: (name) => `Já existe uma linha com esse valor (restrição ${name}). Use outro valor.`,
    unnamed: 'Já existe uma linha com esse valor. Use outro valor.',
  },
  foreign_key_violation: {
    pattern: CONSTRAINT_NAME,
    named: (name) =>
      `A linha aponta para outra que não existe, ou outra linha depende dela (restrição ${name}).`,
    unnamed: 'A linha aponta para outra que não existe, ou outra linha depende dela.',
  },
  not_null_violation: {
    pattern: CONSTRAINT_NAME,
    named: (name) => `A coluna ${name} é obrigatória. Preencha um valor.`,
    unnamed: 'Uma coluna obrigatória ficou vazia. Preencha um valor.',
  },
  check_violation: {
    pattern: CONSTRAINT_NAME,
    named: (name) => `O valor não passa na regra ${name} da tabela. Confira o valor.`,
    unnamed: 'O valor não passa numa regra da tabela. Confira o valor.',
  },
  exclusion_violation: {
    pattern: CONSTRAINT_NAME,
    named: (name) => `O valor conflita com outra linha (restrição ${name}).`,
    unnamed: 'O valor conflita com outra linha.',
  },
  column_not_found: {
    pattern: /^column (.+) does not exist$/,
    named: (name) => `A coluna ${name} não existe mais. Recarregue a página.`,
    unnamed: 'Uma coluna não existe mais. Recarregue a página.',
  },
}

/** The Portuguese sentence for a refusal that names a constraint or column, or `null`. */
export function describeNamedRefusal(code: string, message: string): string | null {
  const entry = NAMED_MESSAGES[code]

  if (entry === undefined) {
    return null
  }

  const name = entry.pattern.exec(message)?.[1] ?? ''

  if (name === '') {
    return entry.unnamed
  }

  return entry.named(name)
}
