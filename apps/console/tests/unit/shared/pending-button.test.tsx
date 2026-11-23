import { render, screen } from '@testing-library/react'
import { Send } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { PendingButton } from '@/shared/ui/pending-button'

describe('PendingButton', () => {
  it('puts the spinner first and hides its own icon while pending', () => {
    render(
      <PendingButton isPending>
        <Send aria-hidden data-icon="inline-start" />
        Enviar
      </PendingButton>,
    )
    const button = screen.getByRole('button', { name: 'Enviar' })

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.firstElementChild).toHaveAttribute('data-slot', 'spinner')
    expect(button.className).toContain('[&>svg[data-icon=inline-start]:not(:first-child)]:hidden')
  })

  it('shows only its own icon when idle', () => {
    render(
      <PendingButton>
        <Send aria-hidden data-icon="inline-start" />
        Enviar
      </PendingButton>,
    )
    const button = screen.getByRole('button', { name: 'Enviar' })

    expect(button).toBeEnabled()
    expect(button.className).not.toContain(':not(:first-child)]:hidden')
  })
})
