import type { JSX } from 'react'

import { HighlightedCode } from '@/shared/ui/highlighted-code'

const SAMPLE = [
  '// npm install @nelcota/sdk',
  'const nelcota = createClient({ url, publishableKey })',
  '',
  'await nelcota.auth.signInWithPassword({ email, password })',
  "await nelcota.from('pedidos').select('*').execute()",
].join('\n')

/** The SDK in four lines: create the client, sign in, query a table under RLS. */
export function ShowcaseCodeCard(): JSX.Element {
  return (
    <figure className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-background">
      <figcaption className="border-b border-border/60 px-3.5 py-2 font-mono text-2xs text-muted-foreground">
        app.ts
      </figcaption>
      <pre className="p-3.5 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        <HighlightedCode code={SAMPLE} language="typescript" />
      </pre>
    </figure>
  )
}
