import { Plus, Server, Smartphone } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import type { components } from '@/shared/api/api-schema'
import { ChoiceCards, type Choice } from '@/shared/ui/choice-cards'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { PendingButton } from '@/shared/ui/pending-button'
import { TextField } from '@/shared/ui/text-field'

type ApiKeyKind = components['schemas']['ApiKeyKind']

const MAX_NAME_LENGTH = 64
const NAME_TOO_LONG = `Use até ${MAX_NAME_LENGTH} caracteres.`

const KIND_CHOICES: Choice<ApiKeyKind>[] = [
  {
    value: 'publishable',
    icon: Smartphone,
    title: 'Publicável',
    description: 'Vai no app, web ou mobile. Pode ficar visível no código.',
  },
  {
    value: 'secret',
    icon: Server,
    title: 'Secreta',
    description: 'Fica só no servidor e aparece uma vez, logo após criar.',
  },
]

type CreateKeyDialogProps = {
  isPending: boolean
  isDisabled: boolean
  /** Resolves once created; the dialog stays open, with the error, when it fails. */
  onCreate: (body: { kind: ApiKeyKind; name: string }) => Promise<void>
}

/** The page's main action: picks the kind of key and an optional name to tell it apart. */
export function CreateKeyDialog(props: CreateKeyDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [kind, setKind] = useState<ApiKeyKind>('publishable')
  const [name, setName] = useState('')

  function open(): void {
    setKind('publishable')
    setName('')
    setIsOpen(true)
  }

  return (
    <>
      <PendingButton
        type="button"
        disabled={props.isDisabled}
        isPending={props.isPending}
        onClick={open}
      >
        <Plus aria-hidden data-icon="inline-start" />
        Nova chave
      </PendingButton>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Nova chave de API"
        description="Uma chave secreta nunca vai para o app."
        confirmLabel="Criar chave"
        size="lg"
        canConfirm={name.trim().length <= MAX_NAME_LENGTH}
        onConfirm={() => props.onCreate({ kind, name: name.trim() })}
      >
        <ChoiceCards
          legend="Tipo"
          choices={KIND_CHOICES}
          selected={kind}
          onSelect={setKind}
          columns={2}
        />
        <TextField
          label="Nome"
          isOptional
          placeholder="App iOS, Servidor de produção…"
          autoComplete="off"
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={nameError(name)}
        />
      </ConfirmDialog>
    </>
  )
}

function nameError(name: string): string | undefined {
  if (name.trim().length <= MAX_NAME_LENGTH) {
    return undefined
  }

  return NAME_TOO_LONG
}
