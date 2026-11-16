import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { queryClient } from '@/app/query-client'
import { router } from '@/app/router'
import '@/app/global.css'

const ROOT_ELEMENT_ID = 'root'
const rootElement = document.getElementById(ROOT_ELEMENT_ID)

if (rootElement === null) {
  throw new Error(`index.html must contain an element with id "${ROOT_ELEMENT_ID}"`)
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
