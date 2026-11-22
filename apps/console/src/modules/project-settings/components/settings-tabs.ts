export type SettingsTabId = 'geral' | 'api' | 'autenticacao' | 'seguranca' | 'notificacoes'

export type SettingsTab = {
  id: SettingsTabId
  label: string
}

export const SETTINGS_TABS: readonly SettingsTab[] = [
  { id: 'geral', label: 'Geral' },
  { id: 'api', label: 'API' },
  { id: 'autenticacao', label: 'Autenticação' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'notificacoes', label: 'Notificações' },
]

/** The tab named by `value` (a URL hash or a tab trigger); anything unknown opens Geral. */
export function settingsTabOf(value: string): SettingsTabId {
  const id = value.replace(/^#/, '')

  return SETTINGS_TABS.find((tab) => tab.id === id)?.id ?? 'geral'
}
