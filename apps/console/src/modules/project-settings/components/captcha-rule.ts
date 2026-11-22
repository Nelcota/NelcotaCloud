/** What the captcha guards while on, or how to turn it on. */
export function captchaRule(siteKey: string | null): string {
  if (siteKey === null) {
    return 'Crie um widget no painel do Turnstile.'
  }

  return 'Exigido no cadastro, login e links.'
}
