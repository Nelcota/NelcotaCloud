import ArrowLeft from '~icons/solar/arrow-left-linear'
import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

export function BackToTables({ projectId }: { projectId: string }): JSX.Element {
  return (
    <Link
      to="/projects/$projectId/database"
      params={{ projectId }}
      className="text-muted-foreground hover:text-foreground -mb-3 flex w-fit items-center gap-1.5 rounded-md text-sm transition-colors"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      Banco de dados
    </Link>
  )
}
