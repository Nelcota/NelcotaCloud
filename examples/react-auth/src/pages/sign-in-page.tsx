import type { JSX } from 'react'

import { Card } from '../components/card'
import { EmailLinkForm } from '../components/email-link-form'
import { OAuthButtons } from '../components/oauth-buttons'
import { PasswordForm } from '../components/password-form'
import type { LoginHandler } from '../lib/login-handler'
import { nelcota } from '../lib/nelcota'

type SignInPageProps = { onLogin: LoginHandler }

async function sendMagicLink(email: string): Promise<void> {
  await nelcota.auth.sendMagicLink({ email })
}

async function recoverPassword(email: string): Promise<void> {
  await nelcota.auth.recoverPassword({ email })
}

export function SignInPage({ onLogin }: SignInPageProps): JSX.Element {
  return (
    <>
      <Card title="E-mail e senha">
        <PasswordForm onLogin={onLogin} />
      </Card>
      <Card title="Link mágico">
        <EmailLinkForm
          buttonLabel="Enviar link de acesso"
          sentNotice="Se o e-mail puder entrar, o link chega em instantes."
          send={sendMagicLink}
        />
      </Card>
      <Card title="Redes sociais">
        <OAuthButtons />
      </Card>
      <Card title="Esqueci a senha">
        <EmailLinkForm
          buttonLabel="Enviar link de redefinição"
          sentNotice="Se houver uma conta com esse e-mail, o link chega em instantes."
          send={recoverPassword}
        />
      </Card>
    </>
  )
}
