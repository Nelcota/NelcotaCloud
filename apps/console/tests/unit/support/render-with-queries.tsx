import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderResult, render } from '@testing-library/react'
import type { ReactNode } from 'react'

import { TooltipProvider } from '@/shared/ui/primitives/tooltip'

/** Renders inside the app's providers, with a fresh query cache that never retries. */
export function renderWithQueries(ui: ReactNode): RenderResult {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  )
}
