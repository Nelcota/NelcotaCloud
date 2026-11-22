import type { JSX } from 'react'

/** One line of the sample, split into the parts that read in different colors. */
type CodeLine = { id: string; parts: readonly { text: string; tone: CodeTone }[] }

type CodeTone = 'plain' | 'keyword' | 'string' | 'muted'

const TONES: Record<CodeTone, string> = {
  plain: 'text-foreground',
  keyword: 'text-primary',
  string: 'text-info',
  muted: 'text-muted-foreground',
}

const LINES: readonly CodeLine[] = [
  { id: 'comment', parts: [{ text: '// npm install @nelcota/sdk', tone: 'muted' }] },
  {
    id: 'client',
    parts: [
      { text: 'const ', tone: 'keyword' },
      { text: 'nelcota = createClient({ url, publishableKey })', tone: 'plain' },
    ],
  },
  { id: 'blank', parts: [{ text: ' ', tone: 'plain' }] },
  {
    id: 'login',
    parts: [
      { text: 'await ', tone: 'keyword' },
      { text: 'nelcota.auth.signInWithPassword({ email, password })', tone: 'plain' },
    ],
  },
  {
    id: 'query',
    parts: [
      { text: 'await ', tone: 'keyword' },
      { text: 'nelcota.from(', tone: 'plain' },
      { text: "'pedidos'", tone: 'string' },
      { text: ').select(', tone: 'plain' },
      { text: "'*'", tone: 'string' },
      { text: ').execute()', tone: 'plain' },
    ],
  },
]

/** The SDK in four lines: create the client, sign in, query a table under RLS. */
export function ShowcaseCodeCard(): JSX.Element {
  return (
    <figure className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-background">
      <figcaption className="border-b border-border/60 px-3.5 py-2 font-mono text-2xs text-muted-foreground">
        app.ts
      </figcaption>
      <pre className="p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        <code>
          {LINES.map((line) => (
            <span key={line.id} className="block">
              {line.parts.map((part, index) => (
                <span key={index} className={TONES[part.tone]}>
                  {part.text}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  )
}
