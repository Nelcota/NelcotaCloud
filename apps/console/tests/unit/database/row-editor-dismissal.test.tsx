import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import type { draftFromRow as draftFromRowFunction } from '@/modules/database/components/row-draft'
import type { RowEditorSheet as RowEditorSheetComponent } from '@/modules/database/components/row-editor-sheet'

import { renderWithQueries } from '../support/render-with-queries'
import { SimulatedApi } from '../support/simulated-api'
import { PROJECT, table } from './clientes-table'

const api = new SimulatedApi()
let RowEditorSheet: typeof RowEditorSheetComponent
let draftFromRow: typeof draftFromRowFunction

beforeAll(async () => {
  api.install()
  RowEditorSheet = (await import('@/modules/database/components/row-editor-sheet')).RowEditorSheet
  draftFromRow = (await import('@/modules/database/components/row-draft')).draftFromRow
})

describe('RowEditorSheet dismissal', () => {
  it('asks before closing with unsaved edits, and keeps them when the user goes back', async () => {
    const row = { id: 7, nome: 'Ana' }
    const onOpenChange = vi.fn()
    renderWithQueries(
      <RowEditorSheet
        projectId={PROJECT}
        table={table}
        isOpen
        onOpenChange={onOpenChange}
        target={{
          kind: 'existing',
          number: 1,
          key: [{ column: 'id', operator: 'eq', value: '7' }],
          draft: draftFromRow(table.columns, row),
          json: JSON.stringify(row),
        }}
      />,
    )

    await userEvent.type(screen.getByDisplayValue('Ana'), ' Souza')
    await userEvent.keyboard('{Escape}')

    expect(await screen.findByText('Descartar as alterações?')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Continuar editando' }))
    expect(screen.getByDisplayValue('Ana Souza')).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('deletes a row without also sending its edits as an update', async () => {
    api.on('DELETE', '/rest/v1/clientes', { status: 200, body: [{ id: 8 }] })
    const row = { id: 8, nome: 'Caio' }
    renderWithQueries(
      <RowEditorSheet
        projectId={PROJECT}
        table={table}
        isOpen
        onOpenChange={vi.fn()}
        target={{
          kind: 'existing',
          number: 2,
          key: [{ column: 'id', operator: 'eq', value: '8' }],
          draft: draftFromRow(table.columns, row),
          json: JSON.stringify(row),
        }}
      />,
    )

    const patchesBefore = api.callsTo('PATCH', '/rest/v1/clientes').length
    await userEvent.type(screen.getByDisplayValue('Caio'), ' Lima')
    await userEvent.click(screen.getByRole('button', { name: 'Excluir linha' }))
    const dialog = await screen.findByRole('dialog', { name: /Excluir a linha 2/ })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Excluir linha' }))

    await waitFor(() => expect(api.callsTo('DELETE', '/rest/v1/clientes')).toHaveLength(1))
    expect(api.callsTo('PATCH', '/rest/v1/clientes')).toHaveLength(patchesBefore)
  })
})
