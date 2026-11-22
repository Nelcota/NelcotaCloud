import { Plus } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import {
  EndpointFormDialog,
  type EndpointFormValues,
} from '@/modules/webhooks/components/endpoint-form-dialog'
import { Button } from '@/shared/ui/primitives/button'

export type EndpointCreator = {
  isDisabled: boolean
  /** Resolves once created; the dialog stays open, with the error, when it fails. */
  onCreate: (values: EndpointFormValues) => Promise<unknown>
}

type CreateEndpointButtonProps = { creator: EndpointCreator }

/** Opens the guided form for a new endpoint, subscribed to new users by default. */
export function CreateEndpointButton({ creator }: CreateEndpointButtonProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button type="button" disabled={creator.isDisabled} onClick={() => setIsOpen(true)}>
        <Plus aria-hidden data-icon="inline-start" />
        Novo endpoint
      </Button>
      <EndpointFormDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Novo endpoint"
        submitLabel="Criar endpoint"
        initial={{ url: '', event_types: ['user.created'] }}
        onSubmit={creator.onCreate}
      />
    </>
  )
}
