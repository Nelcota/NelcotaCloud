import { useLocation } from '@tanstack/react-router'
import AltArrowDown from '~icons/solar/alt-arrow-down-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { CopyButton } from '@/shared/ui/copy-button'

const UNKNOWN_ERROR = 'Erro desconhecido.'
const GENERIC_ERROR_NAME = 'Error'

type ErrorReportProps = {
  error: unknown
}

/**
 * What a bug report needs (where it broke, when, the raw error), folded away so the page
 * talks to people first. "Copiar" copies all of it as plain text.
 */
export function ErrorReport({ error }: ErrorReportProps): JSX.Element {
  const { pathname } = useLocation()
  const [failedAt] = useState(() => new Date().toLocaleString('pt-BR'))
  const name = nameOf(error)
  const message = messageOf(error)
  const report = `Página: ${pathname}\nHorário: ${failedAt}\n${name}: ${message}`

  return (
    <div className="border-t pt-3">
      <details className="group -mx-2">
        <summary className="text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-ring/50 flex list-none items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-3 [&::-webkit-details-marker]:hidden">
          Detalhes do erro
          <AltArrowDown
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div className="bg-muted/40 mx-2 mt-2 overflow-hidden rounded-xl border">
          <div className="text-muted-foreground flex items-center justify-between gap-3 border-b py-1.5 pr-1.5 pl-3 text-xs">
            <p className="min-w-0 truncate">
              <span className="text-foreground font-mono">{pathname}</span>
              <span aria-hidden="true"> · </span>
              <time className="tabular-nums">{failedAt}</time>
            </p>
            <CopyButton value={report} description="o relatório do erro" isCompact />
          </div>
          <pre className="max-h-48 overflow-auto px-3 py-3 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
            <span className="text-destructive">{name}</span>
            <span className="text-code-muted">: </span>
            {message}
          </pre>
        </div>
      </details>
    </div>
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
