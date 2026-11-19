import { createLazyRoute } from '@tanstack/react-router'

import { SqlEditorPage } from '@/modules/database/sql-editor/pages/sql-editor-page'

/** Loaded on demand, so the page's code is its own chunk. */
export const sqlEditorLazyRoute = createLazyRoute('/_authenticated/projects/$projectId/sql')({
  component: SqlEditorPage,
})
