/**
 * The browser writes its own validation bubbles in the language of its UI, not the page's;
 * these replace them with Portuguese for the checks the console's fields use.
 */
export function describeValidity(input: HTMLInputElement, patternMessage?: string): string {
  const validity = input.validity

  if (validity.valueMissing) {
    return 'Preencha este campo.'
  }

  if (validity.typeMismatch && input.type === 'email') {
    return 'Digite um email válido, como nome@empresa.com.'
  }

  if (validity.tooShort) {
    return `Use pelo menos ${input.minLength} caracteres.`
  }

  if (validity.patternMismatch && patternMessage !== undefined) {
    return patternMessage
  }

  return ''
}
