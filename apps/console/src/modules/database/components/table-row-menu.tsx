import { Ellipsis as MenuDots, Copy, Link2 } from 'lucide-react'
import type { JSX } from 'react'

import { restUrl } from '@/modules/database/components/snippet-syntax'
import { useClipboard } from '@/shared/lib/use-clipboard'
import { Button } from '@/shared/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

type TableRowMenuProps = { table: string }

/** What code needs to reach the table, one copy away; its name in the row opens it. */
export function TableRowMenu({ table }: TableRowMenuProps): JSX.Element {
  const { copy, announcement } = useClipboard({ announce: 'Copiado.' })

  return (
    <>
      <span className="sr-only" role="status">
        {announcement}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" aria-label={`Ações de ${table}`}>
            <MenuDots aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => void copy(table)}>
            <Copy aria-hidden />
            Copiar nome
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void copy(restUrl(encodeURIComponent(table)))}>
            <Link2 aria-hidden />
            Copiar endpoint
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
