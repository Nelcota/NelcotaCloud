import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/** jsdom has no ResizeObserver; Radix sizes checkboxes and popovers with it. */
class StillResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = StillResizeObserver
}

afterEach(() => {
  cleanup()
})
