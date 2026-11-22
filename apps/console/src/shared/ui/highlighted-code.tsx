import type { JSX } from 'react'

import type { CodeTone } from '@/shared/lib/code-highlight/code-grammars'
import type { CodeLanguage } from '@/shared/lib/code-highlight/code-language'
import { tokenizeCode } from '@/shared/lib/code-highlight/tokenize-code'

const TONE_CLASSES: Record<CodeTone, string> = {
  plain: '',
  keyword: 'text-primary',
  string: 'text-info',
  comment: 'text-muted-foreground',
  literal: 'text-warning',
  property: 'text-heading',
}

type HighlightedCodeProps = { code: string; language: CodeLanguage }

/** The text of a `<code>` element, colored by language with the theme's tokens. */
export function HighlightedCode({ code, language }: HighlightedCodeProps): JSX.Element {
  const tokens = tokenizeCode(code, language)

  return (
    <code>
      {tokens.map((token, index) => (
        <span key={index} className={TONE_CLASSES[token.tone]}>
          {token.text}
        </span>
      ))}
    </code>
  )
}
