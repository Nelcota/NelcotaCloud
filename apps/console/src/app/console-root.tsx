import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { type JSX, useState } from 'react'

import { createQueryClient } from '@/app/query-client'
import { router } from '@/app/router'
import { useSession } from '@/shared/auth/use-session'
import { ConsoleTheme } from '@/shared/theme/console-theme'

export function ConsoleRoot(): JSX.Element {
  const session = useSession()

  return <AccountQueries key={session?.user.id ?? 'signed-out'} />
}

function AccountQueries(): JSX.Element {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <ConsoleTheme>
        <RouterProvider router={router} />
      </ConsoleTheme>
    </QueryClientProvider>
  )
}
