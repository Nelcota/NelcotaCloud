/** The languages the console's snippets are written in; `plain` is shown without colors. */
export type CodeLanguage = 'typescript' | 'shell' | 'http' | 'json' | 'sql' | 'env' | 'plain'

const LANGUAGE_BY_TITLE: Record<string, CodeLanguage> = {
  bash: 'shell',
  curl: 'shell',
  shell: 'shell',
  terminal: 'shell',
  http: 'http',
  json: 'json',
  sql: 'sql',
}

const LANGUAGE_BY_EXTENSION: Record<string, CodeLanguage> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'typescript',
  json: 'json',
  sql: 'sql',
  sh: 'shell',
}

/** The language a code bar names: a language ("curl") or a file name ("nelcota.ts", ".env"). */
export function languageOfTitle(title: string | undefined): CodeLanguage {
  if (title === undefined) {
    return 'plain'
  }

  const name = title.trim().toLowerCase()

  if (name.startsWith('.env')) {
    return 'env'
  }

  const extension = name.split('.').at(-1) ?? ''

  return LANGUAGE_BY_TITLE[name] ?? LANGUAGE_BY_EXTENSION[extension] ?? 'plain'
}
