import type { JSX } from 'react'

import type { AiContext } from '@/modules/overview/components/ai-context'
import {
  curlSnippet,
  jwksSnippet,
  sdkSnippet,
} from '@/modules/overview/components/connect-snippets'
import { ApiSheet } from '@/shared/ui/api-sheet'

/** Connecting to the project from code: the SDK client, a public read with curl and the JWKS. */
export function ConnectApiSheet({ context }: { context: AiContext | null }): JSX.Element | null {
  if (context === null) {
    return null
  }

  const snippets = [
    { label: 'SDK', title: 'nelcota.ts', code: sdkSnippet(context) },
    { label: 'curl', title: 'bash', code: curlSnippet(context) },
    { label: 'JWKS', title: 'verify.ts', code: jwksSnippet(context) },
  ]

  return (
    <ApiSheet
      title="Conectar pela API"
      description="Use a publishable key no app; a secret key fica só no servidor."
      snippets={snippets}
    />
  )
}
