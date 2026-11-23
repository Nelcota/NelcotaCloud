import Plug from '~icons/solar/plug-circle-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { DatabaseTypesPanel } from '@/modules/database/components/database-types-panel'
import { DirectConnectionPanel } from '@/modules/database/components/direct-connection-panel'
import { Button } from '@/shared/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Tab, TabList, TabPanel, Tabs } from '@/shared/ui/tabs'

/** Ways in from code beyond the REST API: Postgres itself, and types for the SDK. */
export function ConnectSheet({ projectId }: { projectId: string }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState('postgres')

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <Plug />
        Conectar
      </Button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="gap-0 overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
          <SheetHeader className="px-6 pt-5 pr-14">
            <SheetTitle className="text-lg font-semibold">Conectar ao banco</SheetTitle>
            <SheetDescription>
              Para ORMs e ferramentas de Postgres, e tipos TypeScript para o SDK.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-6">
            <Tabs value={tab} onChange={setTab}>
              <TabList label="Forma de conexão">
                <Tab value="postgres">Postgres</Tab>
                <Tab value="types">Tipos TypeScript</Tab>
              </TabList>
              <TabPanel value="postgres">
                <DirectConnectionPanel projectId={projectId} />
              </TabPanel>
              <TabPanel value="types">
                <DatabaseTypesPanel projectId={projectId} />
              </TabPanel>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
