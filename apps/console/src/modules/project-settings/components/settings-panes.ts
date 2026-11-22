import Code from '~icons/solar/code-square-linear'
import Danger from '~icons/solar/danger-triangle-linear'
import Lock from '~icons/solar/lock-keyhole-linear'
import Settings from '~icons/solar/settings-linear'
import Shield from '~icons/solar/shield-check-linear'
import type { IconComponent } from '@/shared/ui/icon-component'

export type SettingsPaneId = 'geral' | 'api' | 'autenticacao' | 'seguranca' | 'perigo'

export type SettingsPane = {
  id: SettingsPaneId
  label: string
  description: string
  icon: IconComponent
  isDanger?: boolean
}

const GENERAL_PANE: SettingsPane = {
  id: 'geral',
  label: 'Geral',
  description: 'Identidade, nome e site do app.',
  icon: Settings,
}

export const SETTINGS_PANES: readonly SettingsPane[] = [
  GENERAL_PANE,
  {
    id: 'api',
    label: 'API e endpoints',
    description: 'Endereços e identificadores para ligar o app.',
    icon: Code,
  },
  {
    id: 'autenticacao',
    label: 'Autenticação',
    description: 'Quem pode entrar.',
    icon: Lock,
  },
  {
    id: 'seguranca',
    label: 'Segurança',
    description: 'Barre robôs no cadastro e no login.',
    icon: Shield,
  },
  {
    id: 'perigo',
    label: 'Zona de perigo',
    description: 'Ações sem volta.',
    icon: Danger,
    isDanger: true,
  },
]

/** The pane named by the URL hash (`#seguranca`); anything unknown opens Geral. */
export function paneFromHash(hash: string): SettingsPane {
  const id = hash.replace(/^#/, '')

  return SETTINGS_PANES.find((pane) => pane.id === id) ?? GENERAL_PANE
}
