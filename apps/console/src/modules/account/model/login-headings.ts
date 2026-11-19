import { MFA_HEADING } from '@/modules/account/components/mfa-heading'
import { AUTH_MARKS } from '@/modules/account/model/auth-marks'
import type { Invitation } from '@/modules/account/model/login-search'
import type { StatusMark } from '@/shared/ui/status-icon'

export type LoginStepKind = 'sign-in' | 'sign-up' | 'recover' | 'magic-link' | 'mfa' | 'notice'

export type LoginHeading = {
  title: string
  description?: string
  /** The browser tab's name for the step, short enough to read in a crowded tab bar. */
  tabTitle: string
  mark?: StatusMark
}

const INVITED_DESCRIPTION = 'Use o email que recebeu o convite.'

const HEADINGS: Record<LoginStepKind, LoginHeading> = {
  'sign-in': {
    title: 'Boas-vindas à Nelcota',
    description: 'Entre para gerenciar seus projetos.',
    tabTitle: 'Entrar',
  },
  'sign-up': {
    title: 'Crie sua conta',
    tabTitle: 'Criar conta',
  },
  recover: {
    title: 'Recuperar acesso',
    description: 'Enviaremos um link para criar uma senha nova.',
    tabTitle: 'Recuperar acesso',
    mark: AUTH_MARKS.recover,
  },
  'magic-link': {
    title: 'Entrar com link por email',
    description: 'Enviaremos um link que entra direto, sem senha.',
    tabTitle: 'Link de acesso',
    mark: AUTH_MARKS.magicLink,
  },
  mfa: { ...MFA_HEADING, tabTitle: 'Verificação', mark: AUTH_MARKS.mfa },
  // The notice itself says where the link went, then what to do if it does not arrive.
  notice: {
    title: 'Confira seu email',
    tabTitle: 'Confira seu email',
    mark: AUTH_MARKS.emailSent,
  },
}

/** Someone who came from an invitation is told what they are joining and which address to use. */
export function loginHeadingOf(kind: LoginStepKind, invitation: Invitation | null): LoginHeading {
  if (invitation === null) {
    return HEADINGS[kind]
  }

  if (kind === 'sign-in') {
    return {
      title: `Entre para aceitar o convite${projectSuffix(invitation)}`,
      description: INVITED_DESCRIPTION,
      tabTitle: 'Aceitar convite',
    }
  }

  if (kind === 'sign-up') {
    return {
      title: `Crie sua conta para aceitar o convite${projectSuffix(invitation)}`,
      description: INVITED_DESCRIPTION,
      tabTitle: 'Aceitar convite',
    }
  }

  return HEADINGS[kind]
}

function projectSuffix(invitation: Invitation): string {
  if (invitation.projectName === '') {
    return ''
  }

  return ` para ${invitation.projectName}`
}
