const SVG_PATTERN = /^<svg([^>]*)>([\s\S]*)<\/svg>$/
const VIEW_BOX_PATTERN = /viewBox="([^"]+)"/

/**
 * Turns an Iconify SVG into a React component module, so `~icons/solar/*` imports need no
 * extra SVG-to-JSX tooling. Icons are decorative by default (`aria-hidden`) unless the caller
 * names them with `aria-label`; size and color come from CSS (`size-4`, `currentColor`).
 */
export function compileReactIcon(svg: string, collection: string, icon: string): string {
  const match = SVG_PATTERN.exec(svg.trim())
  const attributes = match?.[1]
  const body = match?.[2]

  if (attributes === undefined || body === undefined) {
    throw new Error('Iconify returned an SVG without a body')
  }

  const viewBox = VIEW_BOX_PATTERN.exec(attributes)?.[1] ?? '0 0 24 24'
  const isOutline = collection === 'solar' && icon.endsWith('-linear')

  return [
    "import { createElement, forwardRef } from 'react'",
    `const body = ${JSON.stringify(body)}`,
    'const Icon = forwardRef(function Icon(props, ref) {',
    "  const isNamed = props['aria-label'] !== undefined",
    "  return createElement('svg', {",
    "    xmlns: 'http://www.w3.org/2000/svg',",
    `    viewBox: ${JSON.stringify(viewBox)},`,
    "    width: '1em',",
    "    height: '1em',",
    ...(isOutline ? ["    'data-icon-style': 'outline',"] : []),
    "    focusable: 'false',",
    "    'aria-hidden': isNamed ? undefined : true,",
    "    role: isNamed ? 'img' : undefined,",
    '    ...props,',
    '    ref,',
    '    dangerouslySetInnerHTML: { __html: body },',
    '  })',
    '})',
    'export default Icon',
  ].join('\n')
}
