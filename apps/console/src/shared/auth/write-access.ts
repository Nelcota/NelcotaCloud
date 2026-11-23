import { createContext, useContext } from 'react'

/** Shown beside every write action a viewer cannot run, instead of a refusal after the work. */
export const READ_ONLY_REASON = 'Só leitura: peça a um dono para editar'

/**
 * Whether the account may only read the project on screen. Set by the shell around a project's
 * pages; the shared write controls (submit buttons, confirmations, step dialogs) read it.
 */
export const ReadOnlyContext = createContext(false)

/** Why write actions are blocked here, or `null` when the account may write. */
export function useReadOnlyReason(): string | null {
  if (useContext(ReadOnlyContext) === false) {
    return null
  }

  return READ_ONLY_REASON
}
