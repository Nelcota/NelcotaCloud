import { grammarOf } from '@/shared/lib/code-highlight/code-grammars'
import type { CodeTone, Grammar } from '@/shared/lib/code-highlight/code-grammars'
import type { CodeLanguage } from '@/shared/lib/code-highlight/code-language'

export type CodeToken = { text: string; tone: CodeTone }

/** Beyond this the code is shown plain: thousands of spans would slow the sheet that opens it. */
const MAX_HIGHLIGHTED_LENGTH = 50_000

/** Splits code into colored pieces; joined back, the pieces are exactly the code. */
export function tokenizeCode(code: string, language: CodeLanguage): CodeToken[] {
  const grammar = grammarOf(language)

  if (grammar === null || code.length > MAX_HIGHLIGHTED_LENGTH) {
    return [{ text: code, tone: 'plain' }]
  }

  return tokensOf(code, grammar)
}

function tokensOf(code: string, grammar: Grammar): CodeToken[] {
  const pattern = combinedPattern(grammar)
  const tokens: CodeToken[] = []
  let position = 0

  for (const match of code.matchAll(pattern)) {
    const start = match.index
    tokens.push({ text: code.slice(position, start), tone: 'plain' })
    tokens.push({ text: match[0], tone: toneOf(match, grammar) })
    position = start + match[0].length
  }

  tokens.push({ text: code.slice(position), tone: 'plain' })

  return tokens.filter((token) => token.text.length > 0)
}

/** One pattern with a group per rule, so a single scan finds the earliest token of any kind. */
function combinedPattern(grammar: Grammar): RegExp {
  const source = grammar.rules.map((rule) => `(${rule.pattern.source})`).join('|')

  return new RegExp(source, grammar.flags)
}

function toneOf(match: RegExpExecArray, grammar: Grammar): CodeTone {
  const ruleIndex = match.slice(1).findIndex((group) => group !== undefined)
  const rule = grammar.rules.at(ruleIndex)

  if (ruleIndex < 0 || rule === undefined) {
    return 'plain'
  }

  return rule.tone
}
