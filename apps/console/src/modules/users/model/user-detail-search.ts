/** The parts of a user's page, one per tab. */
export type UserTab = 'overview' | 'activity' | 'sessions' | 'metadata'

/** The URL names the open tab in Portuguese, so a link can open the user on it. */
export type UserDetailSearch = { aba?: string }

const TAB_WORDS: Record<Exclude<UserTab, 'overview'>, string> = {
  activity: 'atividade',
  sessions: 'sessoes',
  metadata: 'metadados',
}

/** Keeps only a known tab; the overview is the bare page. */
export function parseUserDetailSearch(search: Record<string, unknown>): UserDetailSearch {
  const tab = tabFromWord(search.aba)

  if (tab === 'overview') {
    return {}
  }

  return { aba: TAB_WORDS[tab] }
}

export function userTabOf(search: UserDetailSearch): UserTab {
  return tabFromWord(search.aba)
}

export function searchForUserTab(tab: UserTab): UserDetailSearch {
  if (tab === 'overview') {
    return {}
  }

  return { aba: TAB_WORDS[tab] }
}

/** The tab a URL word names; anything unknown opens the overview. */
export function tabFromWord(word: unknown): UserTab {
  if (word === TAB_WORDS.activity) {
    return 'activity'
  }

  if (word === TAB_WORDS.sessions) {
    return 'sessions'
  }

  if (word === TAB_WORDS.metadata) {
    return 'metadata'
  }

  return 'overview'
}

const TABS: readonly UserTab[] = ['overview', 'activity', 'sessions', 'metadata']

/** The tab a tab control reports by its value; anything unknown is the overview. */
export function userTabFromId(id: string): UserTab {
  return TABS.find((tab) => tab === id) ?? 'overview'
}
