import { useLocation, useNavigate } from '@tanstack/react-router'

export type AccountTabId = 'perfil' | 'seguranca' | 'sessoes'

export const ACCOUNT_TABS: readonly { id: AccountTabId; label: string }[] = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'seguranca', label: 'Segurança' },
  { id: 'sessoes', label: 'Sessões' },
]

/** The tab named by `value` (a URL hash or a tab trigger); anything unknown opens Perfil. */
export function accountTabOf(value: string): AccountTabId {
  const id = value.replace(/^#/, '')

  return ACCOUNT_TABS.find((tab) => tab.id === id)?.id ?? 'perfil'
}

export type AccountTabSelection = { tab: AccountTabId; select: (value: string) => void }

/** The open tab lives in the URL hash (`#seguranca`), so links, reloads and Back keep it. */
export function useAccountTab(): AccountTabSelection {
  const hash = useLocation({ select: (location) => location.hash })
  const navigate = useNavigate()

  function select(value: string): void {
    void navigate({ to: '.', hash: accountTabOf(value), replace: true, resetScroll: false })
  }

  return { tab: accountTabOf(hash), select }
}
