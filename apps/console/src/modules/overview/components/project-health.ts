import type { StatusTone } from '@/shared/ui/status-badge'

export type ApiState = 'pending' | 'up' | 'down'

export type ProjectHealth = { tone: StatusTone; label: string }

type HealthInputs = {
  api: ApiState
  /** Warnings among the insights; `null` while they load. */
  warnings: number | null
}

/** The project's state in two words: the API first, then the warnings that need a look. */
export function projectHealthOf({ api, warnings }: HealthInputs): ProjectHealth {
  if (api === 'down') {
    return { tone: 'error', label: 'API fora do ar' }
  }

  if (api === 'pending' || warnings === null) {
    return { tone: 'neutral', label: 'Verificando' }
  }

  if (warnings === 1) {
    return { tone: 'warning', label: '1 aviso' }
  }

  if (warnings > 1) {
    return { tone: 'warning', label: `${warnings} avisos` }
  }

  return { tone: 'success', label: 'Saudável' }
}
