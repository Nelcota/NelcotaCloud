/** `captchaToken`: the solved Turnstile widget, when the project requires one. */
export type Credentials = { email: string; password: string; captchaToken?: string }
export type EmailTarget = { email: string; captchaToken?: string }

export function credentialsBody(credentials: Credentials): object {
  const { email, password, captchaToken } = credentials

  return { email, password, ...captchaField(captchaToken) }
}

export function emailBody(target: EmailTarget): object {
  return { email: target.email, ...captchaField(target.captchaToken) }
}

/** The optional token, as the API names it; left out when there is none. */
function captchaField(captchaToken: string | undefined): { captcha_token?: string } {
  if (captchaToken === undefined) {
    return {}
  }

  return { captcha_token: captchaToken }
}
