import { useEffect } from 'react'

const PRODUCT_NAME = 'Nelcota'
const SEPARATOR = ' · '

/**
 * Names the browser tab after the page and its project, so tabs tell apart and screen readers
 * announce where a navigation landed.
 */
export function useDocumentTitle(pageTitle: string, projectName?: string): void {
  const title = [pageTitle, projectName, PRODUCT_NAME]
    .filter((part) => part !== undefined && part !== '')
    .join(SEPARATOR)

  useEffect(() => {
    document.title = title
  }, [title])
}
