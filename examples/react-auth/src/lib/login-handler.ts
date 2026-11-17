import type { SignInResult } from '@nelcota/sdk'

/** Every login (password, magic link, OAuth) ends in a session or in an MFA step. */
export type LoginHandler = (result: SignInResult) => void
