export type CodeLanguage = 'typescript' | 'shell'

export type CodeTokenKind = 'keyword' | 'string' | 'function' | 'property' | 'muted' | 'plain'

/** `start` is the token's offset in the code: unique, so it doubles as a React key. */
export type CodeToken = { kind: CodeTokenKind; text: string; start: number }

/*
 * Enough highlighting for the console's own snippets (SDK setup and install commands), not a
 * general parser: each group is one token kind, tried in order at every position.
 */
const PATTERNS: Record<CodeLanguage, RegExp> = {
  typescript:
    /(?<muted>\/\/[^\n]*)|(?<string>'(?:[^'\\\n]|\\.)*')|(?<keyword>\b(?:import|from|export|const|let|await|async|return|new)\b)|(?<function>\b[A-Za-z_$][\w$]*(?=\())|(?<property>\b[A-Za-z_$][\w$]*(?=\s*:))|(?<punctuation>[{}()[\],.;:])/g,
  shell: /(?<function>^[\w-]+)|(?<keyword>\b(?:install|add|run)\b)|(?<string>@?[\w-]+\/[\w./-]+)/gm,
}

const GROUP_KINDS: Record<string, CodeTokenKind> = {
  muted: 'muted',
  string: 'string',
  keyword: 'keyword',
  function: 'function',
  property: 'property',
  punctuation: 'muted',
}

/** Splits code into colored tokens; text between matches stays plain, so nothing is lost. */
export function highlightCode(code: string, language: CodeLanguage): CodeToken[] {
  const tokens: CodeToken[] = []
  let position = 0

  for (const match of code.matchAll(PATTERNS[language])) {
    const start = match.index
    pushPlain(tokens, { text: code.slice(position, start), start: position })
    tokens.push({ kind: kindOf(match.groups), text: match[0], start })
    position = start + match[0].length
  }

  pushPlain(tokens, { text: code.slice(position), start: position })

  return tokens
}

function pushPlain(tokens: CodeToken[], plain: { text: string; start: number }): void {
  if (plain.text === '') {
    return
  }

  tokens.push({ kind: 'plain', ...plain })
}

function kindOf(groups: Record<string, string | undefined> | undefined): CodeTokenKind {
  const name = Object.entries(groups ?? {}).find(([, value]) => value !== undefined)?.[0]

  return GROUP_KINDS[name ?? ''] ?? 'plain'
}
