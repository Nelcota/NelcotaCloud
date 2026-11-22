import {
  SquareCode as Code,
  TriangleAlert as Danger,
  LockKeyhole as Lock,
  Settings,
  ShieldCheck as Shield,
} from 'lucide-react'
import type { IconComponent } from '@/shared/ui/icon-component'

export type SettingsPaneId = 'geral' | 'api' | 'autenticacao' | 'seguranca' | 'perigo'

/** The labeled groups of the settings sidebar; the danger pane stands alone at the bottom. */
export type SettingsPaneGroupId = 'projeto' | 'acesso'

export type SettingsPane = {
  id: SettingsPaneId
  label: string
  description: string
  icon: IconComponent
  /** `null` for the danger pane, kept apart from the groups. */
  group: SettingsPaneGroupId | null
  isDanger?: boolean
}

export const SETTINGS_PANE_GROUPS: readonly { id: SettingsPaneGroupId; label: string }[] = [
  { id: 'projeto', label: 'Projeto' },
  { id: 'acesso', label: 'Acesso' },
]

const GENERAL_PANE: SettingsPane = {
  id: 'geral',
  label: 'Geral',
  description: 'Identidade, nome e site do app.',
  icon: Settings,
  group: 'projeto',
}

export const DANGER_PANE: SettingsPane = {
  id: 'perigo',
  label: 'Zona de perigo',
  description: 'Ações sem volta.',
  icon: Danger,
  group: null,
  isDanger: true,
}

export const SETTINGS_PANES: readonly SettingsPane[] = [
  GENERAL_PANE,
  {
    id: 'api',
    label: 'API e endpoints',
    description: 'Endereços e identificadores para ligar o app.',
    icon: Code,
    group: 'projeto',
  },
  {
    id: 'autenticacao',
    label: 'Autenticação',
    description: 'Quem pode entrar e por quais métodos.',
    icon: Lock,
    group: 'acesso',
  },
  {
    id: 'seguranca',
    label: 'Segurança',
    description: 'Barre robôs no cadastro e no login.',
    icon: Shield,
    group: 'acesso',
  },
  DANGER_PANE,
]

/** The panes of one sidebar group, in order. */
export function panesOf(group: SettingsPaneGroupId): SettingsPane[] {
  return SETTINGS_PANES.filter((pane) => pane.group === group)
}

/** The pane named by the URL hash (`#seguranca`); anything unknown opens Geral. */
export function paneFromHash(hash: string): SettingsPane {
  const id = hash.replace(/^#/, '')

  return SETTINGS_PANES.find((pane) => pane.id === id) ?? GENERAL_PANE
}
