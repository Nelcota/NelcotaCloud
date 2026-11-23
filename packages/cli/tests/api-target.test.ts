import { describe, expect, it } from 'vitest'

import { CliError } from '../src/cli/cli-error'
import { readRemoteTarget } from '../src/config/api-target'

describe('readRemoteTarget', () => {
  it('reads the secret key and trims the trailing slash of the API address', () => {
    const target = readRemoteTarget(
      { NELCOTA_SECRET_KEY: ' nc_sk_abc ', NELCOTA_API_URL: 'https://api.example.com/' },
      undefined,
    )

    expect(target).toEqual({ apiUrl: 'https://api.example.com', secretKey: 'nc_sk_abc' })
  })

  it('defaults to the local API and lets --api-url win over the variable', () => {
    const environment = { NELCOTA_SECRET_KEY: 'nc_sk_abc', NELCOTA_API_URL: 'https://a.example' }

    expect(readRemoteTarget({ NELCOTA_SECRET_KEY: 'nc_sk_abc' }, undefined).apiUrl).toBe(
      'http://localhost:8080',
    )
    expect(readRemoteTarget(environment, 'https://b.example').apiUrl).toBe('https://b.example')
  })

  it('refuses publishable keys, missing keys and non-web addresses', () => {
    expect(() => readRemoteTarget({ NELCOTA_SECRET_KEY: 'nc_pk_abc' }, undefined)).toThrow(CliError)
    expect(() => readRemoteTarget({}, undefined)).toThrow(CliError)
    expect(() => readRemoteTarget({ NELCOTA_SECRET_KEY: 'nc_sk_abc' }, 'file:///etc')).toThrow(
      CliError,
    )
  })
})
