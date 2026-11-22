/** `aria-current="page"` for the link of the page in view, nothing for the others. */
export function ariaCurrentPage(isCurrent: boolean): 'page' | undefined {
  if (isCurrent) {
    return 'page'
  }

  return undefined
}
