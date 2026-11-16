import type { JSX } from 'react'

type ApiHealthLabelProps = {
  isPending: boolean
  isError: boolean
}

export function ApiHealthLabel({ isPending, isError }: ApiHealthLabelProps): JSX.Element {
  if (isPending) {
    return <span className="text-sm">Verificando a API…</span>
  }

  if (isError) {
    return <span className="text-destructive text-sm font-medium">API fora do ar</span>
  }

  return (
    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">API no ar</span>
  )
}
