import Plus from '~icons/solar/add-linear'
import Globe from '~icons/solar/global-linear'
import LockKeyhole from '~icons/solar/lock-keyhole-minimalistic-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { KeyUseIllustration } from '@/modules/api-keys/components/key-illustrations'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { type Choice, ChoiceCards } from '@/shared/ui/choice-cards'
import { FormField } from '@/shared/ui/form-field'
import { missingUnless } from '@/shared/ui/step-dialog/missing-unless'
import { StepDialog } from '@/shared/ui/step-dialog/step-dialog'

type ApiKeyKind = components['schemas']['ApiKeyKind']

const MAX_NAME_LENGTH = 64

const KIND_CHOICES: Choice<ApiKeyKind>[] = [
  {
    value: 'publishable',
    icon: Globe,
    title: 'Publishable key',
    description: 'Vai dentro do app, web ou mobile. Pode ficar visível no código.',
  },
  {
    value: 'secret',
    icon: LockKeyhole,
    title: 'Secret key',
    description: 'Fica só no seu servidor. Administra usuários; nunca vai para o app.',
  },
]

const NAME_HINTS: Record<ApiKeyKind, string> = {
  publishable: 'Por exemplo, o app que vai usá-la.',
  secret: 'Por exemplo, o serviço que vai usá-la.',
}

const KIND_NAMES: Record<ApiKeyKind, string> = {
  publishable: 'Publishable key',
  secret: 'Secret key',
}

type CreateKeyDialogProps = {
  isPending: boolean
  /** Resolves once created; the dialog stays open, with the error, when it fails. */
  onCreate: (body: { kind: ApiKeyKind; name: string }) => Promise<void>
}

/** Creates a key in two steps: what it is for, then a name to tell it apart later. */
export function CreateKeyDialog({ isPending, onCreate }: CreateKeyDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [kind, setKind] = useState<ApiKeyKind | null>(null)
  const [name, setName] = useState('')

  function open(): void {
    setKind(null)
    setName('')
    setIsOpen(true)
  }

  async function create(): Promise<void> {
    if (kind === null) {
      return
    }

    await onCreate({ kind, name: name.trim() })
  }

  return (
    <>
      <Button disabled={isPending} aria-busy={isPending} onClick={open}>
        <Plus />
        Nova chave
      </Button>
      <StepDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Nova chave de API"
        description="Cada app ou servidor usa uma chave para falar com a NelcotaCloud. Você pode revogar uma sem afetar as outras."
        finishLabel="Criar chave"
        workingLabel="Criando chave…"
        onFinish={create}
        summary={[
          { label: 'Tipo', value: kindName(kind) },
          { label: 'Nome', value: name.trim() },
        ]}
        steps={[
          {
            label: 'Tipo',
            description: 'Escolha onde a chave vai ser usada.',
            missing: missingUnless(kind !== null, 'Escolha o tipo da chave'),
            illustration: <KeyUseIllustration kind={kind} />,
            content: (
              <ChoiceCards
                legend="Onde a chave vai ser usada"
                choices={KIND_CHOICES}
                selected={kind}
                onSelect={setKind}
              />
            ),
          },
          {
            label: 'Nome',
            description: 'Dê um nome para reconhecê-la na lista depois.',
            missing: null,
            content: (
              <FormField
                label="Nome (opcional)"
                placeholder="App iOS, Servidor de produção…"
                hint={nameHint(kind)}
                maxLength={MAX_NAME_LENGTH}
                autoComplete="off"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            ),
          },
        ]}
      />
    </>
  )
}

function kindName(kind: ApiKeyKind | null): string {
  if (kind === null) {
    return ''
  }

  return KIND_NAMES[kind]
}

function nameHint(kind: ApiKeyKind | null): string | undefined {
  if (kind === null) {
    return undefined
  }

  return NAME_HINTS[kind]
}
