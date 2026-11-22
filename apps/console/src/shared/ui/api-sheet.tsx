import { Code2 } from 'lucide-react'
import type { JSX } from 'react'

import { CodeBlock } from '@/shared/ui/code-block'
import { Button } from '@/shared/ui/primitives/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/primitives/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

/** One way to do what the page does from code: the SDK, curl or a raw HTTP request. */
export type ApiSnippet = {
  /** Tab label ("SDK", "curl", "HTTP"). */
  label: string
  /** Shown in the code bar: a file name or a language. */
  title: string
  code: string
}

type ApiSheetProps = {
  /** What the snippets do, as the sheet title ("Usuários pela API"). */
  title: string
  description?: string
  snippets: readonly ApiSnippet[]
}

/** The "API" button of a data page: the same operation as code, with the project's real values. */
export function ApiSheet({ title, description, snippets }: ApiSheetProps): JSX.Element | null {
  const first = snippets[0]

  if (first === undefined) {
    return null
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline">
          <Code2 aria-hidden data-icon="inline-start" />
          API
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <SheetHeader className="gap-1 border-b border-border/60 px-5 py-4">
          <SheetTitle className="text-base font-medium text-heading">{title}</SheetTitle>
          <SheetDescription>
            {description ?? 'O mesmo que esta tela faz, pelo código.'}
          </SheetDescription>
        </SheetHeader>
        <Tabs defaultValue={first.label} className="gap-4 p-5">
          <TabsList variant="line">
            {snippets.map((snippet) => (
              <TabsTrigger key={snippet.label} value={snippet.label}>
                {snippet.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {snippets.map((snippet) => (
            <TabsContent key={snippet.label} value={snippet.label}>
              <CodeBlock code={snippet.code} title={snippet.title} copyLabel={snippet.title} />
            </TabsContent>
          ))}
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
