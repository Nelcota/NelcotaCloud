import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it } from 'vitest'

import type { DirectConnectionPanel as DirectConnectionPanelComponent } from '@/modules/database/components/direct-connection-panel'

import { SimulatedApi } from '../support/simulated-api'
import { renderWithQueries } from '../support/render-with-queries'

const api = new SimulatedApi()
let DirectConnectionPanel: typeof DirectConnectionPanelComponent

const DETAILS = {
  enabled: true,
  host: 'db.example.com',
  port: 6543,
  database: 'tenant_loja',
  user: 'nelcota_c_loja',
  ssl_mode: 'require',
  has_password: false,
}

beforeAll(async () => {
  api.install()
  DirectConnectionPanel = (await import('@/modules/database/components/direct-connection-panel'))
    .DirectConnectionPanel
})

describe('DirectConnectionPanel', () => {
  it('says so when the server offers no direct connections', async () => {
    api.on('GET', '/database/v1/connection', {
      status: 200,
      body: { ...DETAILS, enabled: false, host: null, port: null },
    })

    renderWithQueries(<DirectConnectionPanel projectId="p-off" />)

    expect(await screen.findByText('Este servidor não oferece conexão direta.')).toBeVisible()
  })

  it('shows the URL without the password, and the new password only once it is generated', async () => {
    api.on('GET', '/database/v1/connection', { status: 200, body: DETAILS })
    api.on('POST', '/database/v1/connection/password', {
      status: 200,
      body: {
        password: 'abc123',
        connection_string:
          'postgresql://nelcota_c_loja:abc123@db.example.com:6543/tenant_loja?sslmode=require',
      },
    })

    renderWithQueries(<DirectConnectionPanel projectId="p-on" />)

    // The code block colors the URL in pieces, so it is read as the page's text.
    expect(await screen.findByText('nelcota_c_loja')).toBeVisible()
    expect(document.body).toHaveTextContent(
      'postgresql://nelcota_c_loja:[SENHA]@db.example.com:6543/tenant_loja?sslmode=require',
    )
    expect(document.body).not.toHaveTextContent('abc123')
    await userEvent.click(screen.getByRole('button', { name: 'Gerar senha' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Gerar senha' }))

    expect(
      await screen.findByText('Guarde esta URL agora: a senha não aparece de novo.'),
    ).toBeVisible()
    expect(document.body).toHaveTextContent('nelcota_c_loja:abc123@db.example.com')
  })
})
