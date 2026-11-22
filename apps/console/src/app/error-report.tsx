import { useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useState } from 'react'

import { CodeBlock } from '@/shared/ui/code-block'

const UNKNOWN_ERROR = 'Erro desconhecido.'
const GENERIC_ERROR_NAME = 'Error'

/** What a bug report needs, like a log entry: where it broke, when, and the raw error. */
export function ErrorReport({ error }: { error: unknown }): JSX.Element {
  const { pathname } = useLocation()
  const [failedAt] = useState(() => new Date().toLocaleTimeString('pt-BR'))
  const report = `Página: ${pathname}\nHorário: ${failedAt}\n${nameOf(error)}: ${messageOf(error)}`

  return (
    <CodeBlock
      code={report}
      title="Relatório do erro"
      copyLabel="relatório do erro"
      isWrapped
      maxHeight={240}
    />
  )
}

function nameOf(error: unknown): string {
  if (error instanceof Error && error.name.trim() !== '') {
    return error.name
  }

  return GENERIC_ERROR_NAME
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }

  return UNKNOWN_ERROR
}
