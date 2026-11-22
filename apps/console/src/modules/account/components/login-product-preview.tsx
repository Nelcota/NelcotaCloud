import type { JSX } from 'react'

import { ConsoleMiniature } from '@/modules/account/components/console-miniature'
import { LoginFacts } from '@/modules/account/components/login-facts'

/** The login page's second half: a miniature of the console and what the platform gives devs. */
export function LoginProductPreview(): JSX.Element {
  return (
    <section
      aria-labelledby="login-preview-title"
      className="hidden min-w-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-background p-10 lg:flex"
    >
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="grid gap-1">
          <h2 id="login-preview-title" className="text-xl font-medium text-balance text-heading">
            Auth e banco de dados para cada projeto
          </h2>
          <p className="text-sm text-muted-foreground">
            Um backend por projeto, operado pela API ou por este console.
          </p>
        </div>
        <p className="sr-only">
          Prévia do console: a visão geral de um projeto com usuários ativos, logins e requisições.
        </p>
        <ConsoleMiniature />
        <LoginFacts />
      </div>
    </section>
  )
}
