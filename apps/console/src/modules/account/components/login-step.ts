/** Where the login panel is: which form or message it shows. */
export type LoginStep =
  | { kind: 'sign-in' }
  | { kind: 'sign-up' }
  | { kind: 'mfa'; mfaToken: string }
  | { kind: 'recover' }
  | { kind: 'notice'; message: string }

export const LOGIN_STEP_HEADINGS: Record<
  LoginStep['kind'],
  { title: string; description?: string }
> = {
  'sign-in': { title: 'Entrar' },
  'sign-up': { title: 'Criar conta' },
  mfa: { title: 'Código de verificação', description: 'Os 6 dígitos do seu app autenticador.' },
  recover: { title: 'Redefinir senha', description: 'Enviamos um link para o seu email.' },
  notice: { title: 'Confira seu email' },
}

export const RECOVERY_SENT: LoginStep = {
  kind: 'notice',
  message: 'Se houver uma conta com esse email, o link de redefinição chega em instantes.',
}

export const VERIFICATION_SENT: LoginStep = {
  kind: 'notice',
  message: 'Enviamos um link de confirmação. Abra-o e depois entre.',
}
