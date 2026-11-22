import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type JSX, useState } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'

import type { NotificationChannel } from '@/modules/notifications/api/list-channels'
import type { EditEventsDialog as EditEventsDialogComponent } from '@/modules/notifications/components/edit-events-dialog'

import { renderWithQueries } from '../support/render-with-queries'
import { SimulatedApi } from '../support/simulated-api'

const api = new SimulatedApi()
let EditEventsDialog: typeof EditEventsDialogComponent

beforeAll(async () => {
  api.install()
  EditEventsDialog = (await import('@/modules/notifications/components/edit-events-dialog'))
    .EditEventsDialog
})

const channel: NotificationChannel = {
  id: 'c1',
  kind: 'email',
  target_hint: 'ops@example.com',
  events: ['webhook_failing'],
  created_at: '2026-11-22T20:00:00Z',
}

function Harness(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        abrir
      </button>
      <EditEventsDialog projectId="p" channel={channel} isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}

describe('EditEventsDialog', () => {
  it('reopens on the saved events after a cancelled change', async () => {
    renderWithQueries(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'abrir' }))
    const storage = screen.getByRole('checkbox', { name: /Armazenamento quase cheio/ })
    await userEvent.click(storage)
    expect(storage).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    await userEvent.click(screen.getByRole('button', { name: 'abrir' }))
    expect(screen.getByRole('checkbox', { name: /Armazenamento quase cheio/ })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: /Webhook falhando/ })).toBeChecked()
  })

  it('cannot save with no event ticked', async () => {
    renderWithQueries(<Harness />)

    await userEvent.click(screen.getByRole('button', { name: 'abrir' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Webhook falhando/ }))

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })
})
