import { Pencil } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { useConfigureOAuthRedirectsMutation } from '@/modules/project-settings/queries/use-oauth-providers'
import { CopyButton } from '@/shared/ui/copy-button'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import { Section } from '@/shared/ui/section'
import { TextAreaField } from '@/shared/ui/text-field'

type OAuthRedirectsPanelProps = { projectId: string; urls: string[] }

/** Where the app may send users back after a social login. */
export function OAuthRedirectsPanel({ projectId, urls }: OAuthRedirectsPanelProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [value, setValue] = useState('')
  const save = useConfigureOAuthRedirectsMutation(projectId)

  function open(): void {
    setValue(urls.join('\n'))
    setIsOpen(true)
  }

  async function confirm(): Promise<void> {
    const redirects = value
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url !== '')
    await save.mutateAsync(redirects)
  }

  return (
    <Section
      title="URLs de retorno do app"
      description="Páginas do seu app para onde o login social pode voltar. Não confunda com a URL de callback de cada provedor."
      meta={countOf(urls)}
      isFramed
      action={
        <Button type="button" variant="outline" size="sm" onClick={open}>
          <Pencil aria-hidden data-icon="inline-start" />
          Editar
        </Button>
      }
    >
      <RedirectList urls={urls} />
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Editar URLs de retorno"
        description="Só estas URLs exatas recebem o usuário de volta."
        confirmLabel="Salvar URLs"
        size="lg"
        onConfirm={confirm}
      >
        <TextAreaField
          label="URLs de retorno"
          hint="Uma por linha. Vazia, só o site do projeto é aceito."
          isCode
          rows={4}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </ConfirmDialog>
    </Section>
  )
}

function RedirectList({ urls }: { urls: string[] }): JSX.Element {
  if (urls.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-muted-foreground">
        Nenhuma cadastrada: só URLs sob o site do projeto.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border/60">
      {urls.map((url) => (
        <li
          key={url}
          className="flex min-h-10 items-center gap-2 py-1 ps-4 pe-2 transition-colors hover:bg-surface"
        >
          <code className="min-w-0 flex-1 font-mono text-xs wrap-anywhere">{url}</code>
          <CopyButton value={url} description={url} isIconOnly />
        </li>
      ))}
    </ul>
  )
}

function countOf(urls: string[]): string | undefined {
  if (urls.length === 0) {
    return undefined
  }

  return String(urls.length)
}
