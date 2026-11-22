import type { CodeLanguage } from '@/shared/lib/code-highlight/code-language'

/** What a piece of code is, which picks its color. */
export type CodeTone = 'plain' | 'keyword' | 'string' | 'comment' | 'literal' | 'property'

/** One kind of token. Patterns use only non-capturing groups: the tokenizer numbers the rules. */
export type GrammarRule = { tone: CodeTone; pattern: RegExp }

export type Grammar = { rules: readonly GrammarRule[]; flags: string }

const SINGLE_QUOTED = /'(?:[^'\\\n]|\\.)*'/
const DOUBLE_QUOTED = /"(?:[^"\\\n]|\\.)*"/
const NUMBER = /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/
const JSON_KEY = /"(?:[^"\\\n]|\\.)*"(?=\s*:)/

const JSON_RULES: readonly GrammarRule[] = [
  { tone: 'property', pattern: JSON_KEY },
  { tone: 'string', pattern: DOUBLE_QUOTED },
  { tone: 'literal', pattern: /\b(?:true|false|null)\b/ },
  { tone: 'literal', pattern: NUMBER },
]

const TYPESCRIPT: Grammar = {
  flags: 'g',
  rules: [
    { tone: 'comment', pattern: /\/\/[^\n]*|\/\*[\s\S]*?\*\// },
    { tone: 'string', pattern: SINGLE_QUOTED },
    { tone: 'string', pattern: DOUBLE_QUOTED },
    { tone: 'string', pattern: /`(?:[^`\\]|\\.)*`/ },
    {
      tone: 'keyword',
      pattern:
        /\b(?:import|from|export|default|const|let|var|async|await|function|return|if|new|throw|try|catch|for|of|in|while|type|interface|as|typeof)\b/,
    },
    { tone: 'literal', pattern: /\b(?:true|false|null|undefined)\b/ },
    { tone: 'literal', pattern: NUMBER },
  ],
}

const SHELL: Grammar = {
  flags: 'gm',
  rules: [
    { tone: 'comment', pattern: /(?<=^|\s)#[^\n]*/ },
    { tone: 'string', pattern: SINGLE_QUOTED },
    { tone: 'string', pattern: DOUBLE_QUOTED },
    { tone: 'keyword', pattern: /^\s*(?:curl|npm|npx|pnpm|yarn|export)\b/ },
    { tone: 'property', pattern: /(?<=\s)--?[A-Za-z][\w-]*/ },
    { tone: 'literal', pattern: /\$\{[^}\n]*\}|\$\w+/ },
  ],
}

const HTTP: Grammar = {
  flags: 'gm',
  rules: [
    { tone: 'keyword', pattern: /^(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/ },
    { tone: 'property', pattern: /^[A-Za-z][\w-]*(?=:)/ },
    ...JSON_RULES,
  ],
}

const SQL: Grammar = {
  flags: 'gi',
  rules: [
    { tone: 'comment', pattern: /--[^\n]*/ },
    { tone: 'string', pattern: SINGLE_QUOTED },
    {
      tone: 'keyword',
      pattern:
        /\b(?:select|from|where|and|or|not|in|is|exists|as|on|join|left|inner|insert|into|values|update|set|delete|create|alter|drop|table|policy|using|with|check|case|when|then|else|end|order|by|limit|returning)\b/,
    },
    { tone: 'literal', pattern: /\b(?:true|false|null)\b/ },
    { tone: 'literal', pattern: NUMBER },
  ],
}

const ENV: Grammar = {
  flags: 'gm',
  rules: [
    { tone: 'comment', pattern: /^\s*#[^\n]*/ },
    { tone: 'property', pattern: /^[A-Za-z_]\w*(?==)/ },
    { tone: 'string', pattern: /(?<==)[^\n]+/ },
  ],
}

const GRAMMARS: Record<Exclude<CodeLanguage, 'plain'>, Grammar> = {
  typescript: TYPESCRIPT,
  shell: SHELL,
  http: HTTP,
  json: { flags: 'g', rules: JSON_RULES },
  sql: SQL,
  env: ENV,
}

export function grammarOf(language: CodeLanguage): Grammar | null {
  if (language === 'plain') {
    return null
  }

  return GRAMMARS[language]
}
