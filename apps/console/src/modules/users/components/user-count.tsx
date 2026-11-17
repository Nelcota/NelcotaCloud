import type { JSX } from 'react'

export function UserCount({ total }: { total: number | undefined }): JSX.Element | null {
  if (total === undefined) {
    return null
  }

  if (total === 1) {
    return <p className="text-muted-foreground text-sm">1 usuário</p>
  }

  return <p className="text-muted-foreground text-sm">{total.toLocaleString('pt-BR')} usuários</p>
}
