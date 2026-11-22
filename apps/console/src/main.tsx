import '@/app/global.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { ConsoleRoot } from '@/app/console-root'
import { router } from '@/app/router'
import { forgetSqlDrafts } from '@/modules/sql-editor/components/forget-sql-drafts'
import { nelcota } from '@/shared/auth/nelcota'

const ROOT_ELEMENT_ID = 'root'
const rootElement = document.getElementById(ROOT_ELEMENT_ID)

if (rootElement === null) {
  throw new Error(`index.html must contain an element with id "${ROOT_ELEMENT_ID}"`)
}

let accountId = nelcota.auth.getSession()?.user.id
nelcota.auth.onAuthStateChange((event, session) => {
  const nextAccountId = session?.user.id

  if (accountId === nextAccountId && event !== 'SIGNED_OUT') {
    return
  }

  accountId = nextAccountId
  forgetSqlDrafts()
  void router.invalidate()
})

createRoot(rootElement).render(
  <StrictMode>
    <ConsoleRoot />
  </StrictMode>,
)
