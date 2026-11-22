import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it } from 'vitest'

import type { NotificationsPane as NotificationsPaneComponent } from '@/modules/notifications/components/notifications-pane'

import { SimulatedApi } from '../support/simulated-api'
import { renderWithQueries } from '../support/render-with-queries'

const PROJECT = 'c443cc92-73b4-4c9d-92de-fcb0eace0524'
const CHANNEL = '9b2f1a50-0000-4000-8000-000000000001'
const LIST = '/auth/v1/admin/notifications'

const api = new SimulatedApi()
let NotificationsPane: typeof NotificationsPaneComponent

beforeAll(async () => {
  api.install()
  NotificationsPane = (await import('@/modules/notifications/components/notifications-pane'))
    .NotificationsPane
})

function channel(target: string): Record<string, unknown> {
  return {
    id: CHANNEL,
    kind: 'slack',
    target_hint: target,
    events: ['webhook_failing', 'data_api_errors'],
    created_at: '2026-11-22T20:00:00Z',
  }
}

describe('NotificationsPane', () => {
  it('lists each channel with its events and counts them against the limit', async () => {
    api.on('GET', LIST, { status: 200, body: { channels: [channel('hooks.slack.com/…KEY9')] } })
    renderWithQueries(<NotificationsPane projectId={PROJECT} />)

    expect(await screen.findByText('hooks.slack.com/…KEY9')).toBeInTheDocument()
    expect(screen.getByText('Webhook falhando · Erros na Data API')).toBeInTheDocument()
    expect(screen.getByText('1 de 5 canais')).toBeInTheDocument()
    expect(api.calls.at(-1)?.path).toBe(LIST)
  })

  it('says when there are no channels', async () => {
    api.on('GET', LIST, { status: 200, body: { channels: [] } })
    renderWithQueries(<NotificationsPane projectId={PROJECT} />)

    expect(await screen.findByText('Nenhum canal')).toBeInTheDocument()
  })

  it('sends a test alert and says it went through', async () => {
    api
      .on('GET', LIST, { status: 200, body: { channels: [channel('ops@example.com')] } })
      .on('POST', `${LIST}/${CHANNEL}/test`, { status: 204 })
    renderWithQueries(<NotificationsPane projectId={PROJECT} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Testar' }))

    expect(await screen.findByText('Enviado.')).toBeInTheDocument()
    expect(api.callsTo('POST', `${LIST}/${CHANNEL}/test`)).toHaveLength(1)
  })

  it('shows why a test failed', async () => {
    api
      .on('GET', LIST, { status: 200, body: { channels: [channel('ops@example.com')] } })
      .on('POST', `${LIST}/${CHANNEL}/test`, {
        status: 502,
        body: {
          error: 'notification_test_failed',
          message: 'the channel did not accept the test alert',
        },
      })
    renderWithQueries(<NotificationsPane projectId={PROJECT} />)

    await userEvent.click(await screen.findByRole('button', { name: 'Testar' }))

    await waitFor(() => {
      expect(screen.queryByText('Enviado.')).not.toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveTextContent(/.+/)
    })
  })

  it('draws the remove button in red, as every destructive control', async () => {
    api.on('GET', LIST, { status: 200, body: { channels: [channel('ops@example.com')] } })
    renderWithQueries(<NotificationsPane projectId={PROJECT} />)

    const remove = await screen.findByRole('button', { name: 'Remover canal' })

    expect(remove.className).toContain('text-destructive')
  })
})
