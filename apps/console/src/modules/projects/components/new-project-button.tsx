import { Plus } from 'lucide-react'
import type { JSX } from 'react'

import { RouterLink } from '@/shared/routing/router-link'
import { Button } from '@/shared/ui/primitives/button'

export function NewProjectButton(): JSX.Element {
  return (
    <Button asChild>
      <RouterLink href="/projects/new">
        <Plus aria-hidden data-icon="inline-start" />
        Novo projeto
      </RouterLink>
    </Button>
  )
}
