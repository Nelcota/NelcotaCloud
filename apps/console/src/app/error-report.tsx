import { useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useState } from 'react'

import { CopyButton } from '@/shared/ui/copy-button'

const UNKNOWN_ERROR = 'Erro desconhecido.'
const GENERIC_ERROR_NAME = 'Error'

type ErrorReportProps = {
  error: unknown
}

/**
 * What a bug report needs, laid out like a log entry: where it broke, when, and the raw error.
 * "Copiar" copies all of it as plain text.
 */
export function ErrorReport({ error }: ErrorReportProps): JSX.Element {
  const { pathname } = useLocation()
  const [failedAt] = useState(() => new Date().toLocaleTimeString('pt-BR'))
  const name = nameOf(error)
  const message = messageOf(error)
  const report = `Página: ${pathname}\nHorário: ${failedAt}\n${name}: ${message}`

  return (
    <figure className="bg-card overflow-hidden rounded-xl border shadow-xl shadow-black/10">
      <figcaption className="flex items-center justify-between gap-4 border-b py-2 pr-2 pl-4">
        <span className="flex items-center gap-2.5 text-xs font-medium">
          <span aria-hidden="true" className="bg-destructive size-2 rounded-full" />
          Falha ao carregar a página
        </span>
        <CopyButton value={report} description="o relatório do erro" />
      </figcaption>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-b px-4 py-3 text-xs">
        <dt className="text-muted-foreground">Página</dt>
        <dd className="font-mono break-all">{pathname}</dd>
        <dt className="text-muted-foreground">Horário</dt>
        <dd className="font-mono tabular-nums">{failedAt}</dd>
      </dl>
      <pre className="bg-muted/40 max-h-56 overflow-auto px-4 py-4 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
        <span className="text-destructive">{name}</span>
        <span className="text-code-muted">: </span>
        {message}
      </pre>
    </figure>
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
