import Plus from '~icons/solar/add-linear'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { FormField } from '@/shared/ui/form-field'

type ApiKeyKind = components['schemas']['ApiKeyKind']

const MAX_NAME_LENGTH = 64

const KIND_HINTS: Record<ApiKeyKind, string> = {
  publishable: 'Vai no app (web ou mobile). Dê o nome do app que vai usá-la.',
  secret: 'Fica só no seu servidor. Dê o nome do serviço que vai usá-la.',
}

type CreateKeyDialogProps = {
  kind: ApiKeyKind
  isPrimary: boolean
  isPending: boolean
  onCreate: (body: { kind: ApiKeyKind; name: string }) => void
}

/** Asks for a name before creating a key, so the list can tell keys apart later. */
export function CreateKeyDialog(props: CreateKeyDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    props.onCreate({ kind: props.kind, name: name.trim() })
    setIsOpen(false)
    setName('')
  }

  return (
    <>
      <Button
        variant={buttonVariant(props.isPrimary)}
        disabled={props.isPending}
        aria-busy={props.isPending}
        onClick={() => setIsOpen(true)}
      >
        <Plus />
        {kindLabel(props.kind)}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <form onSubmit={submit} className="grid gap-5">
            <DialogHeader>
              <DialogTitle>Nova {kindLabel(props.kind)}</DialogTitle>
              <DialogDescription>{KIND_HINTS[props.kind]}</DialogDescription>
            </DialogHeader>
            <FormField
              label="Nome (opcional)"
              placeholder="App iOS, Servidor de produção…"
              maxLength={MAX_NAME_LENGTH}
              autoComplete="off"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Criar chave</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function kindLabel(kind: ApiKeyKind): string {
  if (kind === 'secret') {
    return 'Secret key'
  }

  return 'Publishable key'
}

function buttonVariant(isPrimary: boolean): 'default' | 'outline' {
  if (isPrimary) {
    return 'default'
  }

  return 'outline'
}
