import { Plug } from 'lucide-react'
import type { JSX } from 'react'

import { DatabaseTypesPanel } from '@/modules/database/components/database-types-panel'
import { DirectConnectionPanel } from '@/modules/database/components/direct-connection-panel'
import { Button } from '@/shared/ui/primitives/button'
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/primitives/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

/** Ways in from code beyond the REST API: Postgres itself, and types for the SDK. */
export function ConnectSheet({ projectId }: { projectId: string }): JSX.Element {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline">
          <Plug aria-hidden data-icon="inline-start" />
          Conectar
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Conectar ao banco</SheetTitle>
          <SheetDescription>
            Para ORMs e ferramentas de Postgres, e tipos TypeScript para o SDK.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Tabs defaultValue="postgres" className="gap-4">
            <TabsList variant="line">
              <TabsTrigger value="postgres">Postgres</TabsTrigger>
              <TabsTrigger value="types">Tipos TypeScript</TabsTrigger>
            </TabsList>
            <TabsContent value="postgres">
              <DirectConnectionPanel projectId={projectId} />
            </TabsContent>
            <TabsContent value="types">
              <DatabaseTypesPanel projectId={projectId} />
            </TabsContent>
          </Tabs>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
