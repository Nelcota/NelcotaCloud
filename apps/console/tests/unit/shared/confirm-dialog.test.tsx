import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReadOnlyContext } from '@/shared/auth/write-access'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

describe('ConfirmDialog', () => {
  it('tells a viewer up front that the action cannot run', () => {
    render(
      <ReadOnlyContext value={true}>
        <ConfirmDialog
          isOpen
          title="Excluir usuário"
          description="Não dá para desfazer."
          confirmLabel="Excluir"
          onConfirm={vi.fn()}
        />
      </ReadOnlyContext>,
    )

    const button = screen.getByRole('button', { name: 'Excluir' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('Só leitura: peça a um dono para editar')
  })

  it('says what is missing beside the waiting button', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Convidar pessoa"
        description="Ela entra como membro."
        confirmLabel="Enviar convite"
        missing="Digite o email da pessoa"
        onConfirm={vi.fn()}
      />,
    )

    const button = screen.getByRole('button', { name: 'Enviar convite' })
    expect(button).toBeDisabled()
    expect(button).toHaveAccessibleDescription('Digite o email da pessoa')
  })

  it('confirms without submitting a form around the button that opened it', async () => {
    const onOuterSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
    const onConfirm = vi.fn()
    render(
      <form onSubmit={onOuterSubmit}>
        <ConfirmDialog
          isOpen
          title="Excluir a linha?"
          description="Ela sai da tabela."
          confirmLabel="Excluir"
          isDestructive
          onConfirm={onConfirm}
        />
      </form>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onOuterSubmit).not.toHaveBeenCalled()
  })
})
