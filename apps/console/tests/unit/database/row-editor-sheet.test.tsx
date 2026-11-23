import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import type {
  blankDraft as blankDraftFunction,
  draftFromRow as draftFromRowFunction,
} from '@/modules/database/components/row-draft'
import type { RowEditorSheet as RowEditorSheetComponent } from '@/modules/database/components/row-editor-sheet'

import { SimulatedApi } from '../support/simulated-api'
import { renderWithQueries } from '../support/render-with-queries'
import { PROJECT, table } from './clientes-table'

const api = new SimulatedApi()
let RowEditorSheet: typeof RowEditorSheetComponent
let draftFromRow: typeof draftFromRowFunction
let blankDraft: typeof blankDraftFunction

beforeAll(async () => {
  api.install()
  RowEditorSheet = (await import('@/modules/database/components/row-editor-sheet')).RowEditorSheet
  const drafts = await import('@/modules/database/components/row-draft')
  draftFromRow = drafts.draftFromRow
  blankDraft = drafts.blankDraft
})

describe('RowEditorSheet', () => {
  it('saves only the changed column, naming the row by its primary key', async () => {
    api.on('PATCH', '/rest/v1/clientes', { status: 200, body: [{ id: 7 }] })
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

    const name = screen.getByDisplayValue('Ana')
    await userEvent.clear(name)
    await userEvent.type(name, 'Ana Souza')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    const [patch] = api.callsTo('PATCH', '/rest/v1/clientes')
    expect(patch?.body).toEqual({ nome: 'Ana Souza' })
    expect(decodeURIComponent(patch?.search ?? '')).toBe('?select=id&id=eq."7"')
  })

  it('keeps the identity column read-only on an existing row', () => {
    const row = { id: 7, nome: 'Ana' }
    renderWithQueries(
      <RowEditorSheet
        projectId={PROJECT}
        table={table}
        isOpen
        onOpenChange={vi.fn()}
        target={{
          kind: 'existing',
          number: 1,
          key: [{ column: 'id', operator: 'eq', value: '7' }],
          draft: draftFromRow(table.columns, row),
          json: JSON.stringify(row),
        }}
      />,
    )

    expect(screen.getByDisplayValue('7')).toHaveAttribute('readonly')
  })

  it('inserts a new row without the generated column', async () => {
    api.on('POST', '/rest/v1/clientes', { status: 201 })
    renderWithQueries(
      <RowEditorSheet
        projectId={PROJECT}
        table={table}
        isOpen
        onOpenChange={vi.fn()}
        target={{ kind: 'new', draft: blankDraft(table.columns) }}
      />,
    )

    await userEvent.type(screen.getByLabelText(/^nome/), 'Bruno')
    await userEvent.click(screen.getByRole('button', { name: 'Inserir linha' }))

    await waitFor(() => expect(api.callsTo('POST', '/rest/v1/clientes')).toHaveLength(1))
    expect(api.callsTo('POST', '/rest/v1/clientes')[0]?.body).toEqual({ nome: 'Bruno' })
  })

  it('shows the API refusal inside the panel', async () => {
    api.on('POST', '/rest/v1/clientes', {
      status: 409,
      body: { error: 'unique_violation', message: 'duplicate key value' },
    })
    renderWithQueries(
      <RowEditorSheet
        projectId={PROJECT}
        table={table}
        isOpen
        onOpenChange={vi.fn()}
        target={{ kind: 'new', draft: blankDraft(table.columns) }}
      />,
    )

    await userEvent.type(screen.getByLabelText(/^nome/), 'Bruno')
    await userEvent.click(screen.getByRole('button', { name: 'Inserir linha' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
