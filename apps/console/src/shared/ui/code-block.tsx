import type { JSX } from 'react'

import { type CodeLanguage, type CodeTokenKind, highlightCode } from '@/shared/lib/highlight-code'

const TOKEN_CLASSES: Record<CodeTokenKind, string> = {
  keyword: 'text-code-keyword',
  string: 'text-code-string',
  function: 'text-code-function',
  property: 'text-code-property',
  muted: 'text-code-muted',
  plain: '',
}

type CodeBlockProps = {
  code: string
  language: CodeLanguage
}

/** A snippet to read and copy, colored by token kind from the theme's code tokens. */
export function CodeBlock({ code, language }: CodeBlockProps): JSX.Element {
  const tokens = highlightCode(code, language)

  return (
    <pre className="bg-shell/70 overflow-x-auto rounded-xl p-4 font-mono text-xs leading-relaxed">
      <code>
        {tokens.map((token) => (
          <span key={token.start} className={TOKEN_CLASSES[token.kind]}>
            {token.text}
          </span>
        ))}
      </code>
    </pre>
  )
}
