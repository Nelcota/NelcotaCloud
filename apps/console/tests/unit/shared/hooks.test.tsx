import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDebouncedValue } from '@/shared/lib/use-debounced-value'
import { usePickedImage } from '@/shared/lib/use-picked-image'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the old value until typing pauses, then settles on the last one', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '' },
    })

    rerender({ value: 'b' })
    rerender({ value: 'br' })
    rerender({ value: 'bru' })
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe('')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('bru')
  })
})

describe('usePickedImage', () => {
  it('releases the previous URL on each pick and the last one on unmount', () => {
    const create = vi.fn((file: Blob) => `blob:${(file as File).name}`)
    const revoke = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL: create, revokeObjectURL: revoke })
    const { result, unmount } = renderHook(() => usePickedImage())

    act(() => result.current.pick(new File(['a'], 'a.png')))
    act(() => result.current.pick(new File(['b'], 'b.png')))
    expect(revoke).toHaveBeenCalledWith('blob:a.png')
    expect(result.current.picked?.url).toBe('blob:b.png')

    unmount()
    expect(revoke).toHaveBeenLastCalledWith('blob:b.png')
    vi.unstubAllGlobals()
  })
})
