/** The login steps that have their own address, so Back, refresh and shared links keep them. */
export type LoginRouteStep = 'sign-in' | 'sign-up' | 'recover' | 'magic-link'

/** The URL words for each step, in Portuguese since people see and share them. */
const STEP_WORDS: Record<LoginRouteStep, string> = {
  'sign-in': 'entrar',
  'sign-up': 'criar-conta',
  recover: 'recuperar',
  'magic-link': 'link',
}

const ROUTE_STEPS: readonly LoginRouteStep[] = ['sign-in', 'sign-up', 'recover', 'magic-link']
/** A number, so the router writes it as `convite=1`, the same link the invitation email sends. */
const INVITATION_FLAG = 1
/** Project names are short; anything longer did not come from an invitation email. */
const MAX_PROJECT_NAME_LENGTH = 80

export type LoginSearch = {
  etapa?: string
  convite?: number
  /** The invited project's name, shown as text only; it grants nothing. */
  projeto?: string
}

/** Someone who came from an invitation email; the project name is empty when the link had none. */
export type Invitation = { projectName: string }

/** Keeps only the values the login understands; anything else in the URL is dropped. */
export function parseLoginSearch(search: Record<string, unknown>): LoginSearch {
  const step = stepFromWord(search.etapa)
  const parsed: LoginSearch = {}

  if (step !== undefined) {
    parsed.etapa = STEP_WORDS[step]
  }

  if (Number(search.convite) !== INVITATION_FLAG) {
    return parsed
  }

  parsed.convite = INVITATION_FLAG
  const projectName = parseProjectName(search.projeto)

  if (projectName !== '') {
    parsed.projeto = projectName
  }

  return parsed
}

/** An invitation opens on sign-up, since most invited people have no account yet. */
export function loginStepOf(search: LoginSearch): LoginRouteStep {
  const step = stepFromWord(search.etapa)

  if (step !== undefined) {
    return step
  }

  if (invitationOf(search) !== null) {
    return 'sign-up'
  }

  return 'sign-in'
}

export function invitationOf(search: LoginSearch): Invitation | null {
  if (search.convite !== INVITATION_FLAG) {
    return null
  }

  return { projectName: search.projeto ?? '' }
}

/** The search for a login opened from an invitation, for links back to it. */
export function invitationSearch(invitation: Invitation): LoginSearch {
  const search: LoginSearch = { convite: INVITATION_FLAG }

  if (invitation.projectName !== '') {
    search.projeto = invitation.projectName
  }

  return search
}

/** The search for a step, keeping the invitation so switching steps does not lose it. */
export function searchForStep(step: LoginRouteStep, current: LoginSearch): LoginSearch {
  const invitation = invitationOf(current)
  const stepSearch: LoginSearch = { etapa: STEP_WORDS[step] }

  if (invitation === null) {
    return stepSearch
  }

  return { ...stepSearch, ...invitationSearch(invitation) }
}

function stepFromWord(word: unknown): LoginRouteStep | undefined {
  return ROUTE_STEPS.find((step) => STEP_WORDS[step] === word)
}

function parseProjectName(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return ''
  }

  const name = String(value).trim()

  if (name.length > MAX_PROJECT_NAME_LENGTH) {
    return ''
  }

  return name
}
