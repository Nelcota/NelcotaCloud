import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { TrafficBars } from '@/modules/database/components/traffic-bars'

const SERIES = [
  { start: '2026-11-20T00:00:00Z', requests: 10, client_errors: 2, server_errors: 0 },
  { start: '2026-11-21T00:00:00Z', requests: 30, client_errors: 0, server_errors: 3 },
]

describe('TrafficBars', () => {
  it('names both bar colors with their share', () => {
    render(<TrafficBars series={SERIES} period="7d" />)

    expect(screen.getByText('Sucesso')).toBeInTheDocument()
    expect(screen.getByText('Com erro')).toBeInTheDocument()
    expect(screen.getByText('87,5%')).toBeInTheDocument()
    expect(screen.getByText('12,5%')).toBeInTheDocument()
  })

  it('gives every bar its numbers in a table, newest first', async () => {
    render(<TrafficBars series={SERIES} period="7d" />)

    await userEvent.click(screen.getByRole('button', { name: 'Ver por dia' }))
    const rows = within(screen.getByRole('table')).getAllByRole('row')

    expect(rows.map((row) => row.textContent)).toEqual([
      'Dia (UTC)RequisiçõesCom erro',
      '21 de nov.303',
      '20 de nov.102',
    ])
  })
})
