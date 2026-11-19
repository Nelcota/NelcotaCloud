import Plus from '~icons/solar/add-linear'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { type ApiKeyKind, KEY_KINDS, keyKindOf } from '@/modules/api-keys/components/key-kinds'
import { Button } from '@/shared/ui/button'
import { type Choice, ChoiceCards } from '@/shared/ui/choice-cards'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

const MAX_NAME_LENGTH = 64
const DEFAULT_KIND: ApiKeyKind = 'publishable'

const KIND_CHOICES: Choice<ApiKeyKind>[] = KEY_KINDS.map((keyKind) => ({
  value: keyKind.kind,
  icon: keyKind.icon,
  title: `${keyKind.singular} (${keyKind.term})`,
  description: keyKind.choiceText,
}))

type CreateKeyDialogProps = {
  isPending: boolean
  /** Resolves once created; the dialog stays open, with the error, when it fails. */
  onCreate: (kind: ApiKeyKind, name: string) => Promise<void>
}

/** The page's one way to add a key: where it will live decides its kind, then an optional name. */
export function CreateKeyDialog({ isPending, onCreate }: CreateKeyDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [kind, setKind] = useState<ApiKeyKind>(DEFAULT_KIND)
  const [name, setName] = useState('')
  const [error, setError] = useState<unknown>(null)

  function changeOpen(nextIsOpen: boolean): void {
    setIsOpen(nextIsOpen)
    setKind(DEFAULT_KIND)
    setName('')
    setError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)

    try {
      await onCreate(kind, name.trim())
      changeOpen(false)
    } catch (caught) {
      setError(caught)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger render={<Button />}>
        <Plus />
        Nova chave
      </DialogTrigger>
      <DialogContent>
        <form className="grid gap-5" onSubmit={(event) => void submit(event)}>
          <DialogHeader>
            <DialogTitle>Nova chave de API</DialogTitle>
          </DialogHeader>
          <ChoiceCards
            legend="Onde a chave vai ficar"
            choices={KIND_CHOICES}
            selected={kind}
            onSelect={setKind}
          />
          <FormField
            label="Nome (opcional)"
            placeholder={keyKindOf(kind)?.namePlaceholder}
            hint={keyKindOf(kind)?.createWarning}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <ErrorAlert error={error} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => changeOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              Criar chave
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
