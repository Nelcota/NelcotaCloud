import { describe, expect, it, vi } from 'vitest'

import { putStorageObject } from '../src/index'
import type { StorageUpload } from '../src/index'

const signedUpload: StorageUpload = {
  object_id: 'object-a',
  url: 'https://example.r2.cloudflarestorage.com/private/object?signature=upload',
  expires_at: '2026-11-19T15:00:00Z',
  can_upload: true,
  verification_url: 'https://example.r2.cloudflarestorage.com/private/object?signature=verify',
  headers: { 'if-none-match': '*', 'content-type': 'text/plain', 'content-length': '3' },
}

describe('signed storage uploads', () => {
  it('rejects a Blob whose size does not match the signed request before sending', async () => {
    const send = vi.fn<typeof fetch>()
    await expect(
      putStorageObject(signedUpload, new Blob(['too long']), send),
    ).rejects.toMatchObject({ code: 'storage_upload_failed' })
    expect(send).not.toHaveBeenCalled()
  })

  it.each([
    { contents: 'abc', matches: true },
    { contents: 'xyz', matches: false },
  ])(
    'compares the file already stored after a PUT conflict ($contents)',
    async ({ contents, matches }) => {
      const send = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(new Response(null, { status: 412 }))
        .mockResolvedValueOnce(new Response(contents))
      const attempt = putStorageObject(signedUpload, new Blob(['abc']), send)

      if (matches) {
        await expect(attempt).resolves.toBeUndefined()
      } else {
        await expect(attempt).rejects.toMatchObject({ status: 412, code: 'storage_upload_failed' })
      }

      expect(send).toHaveBeenNthCalledWith(
        2,
        signedUpload.verification_url,
        expect.objectContaining({
          credentials: 'omit',
          redirect: 'error',
          referrerPolicy: 'no-referrer',
        }),
      )
    },
  )
})
