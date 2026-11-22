import { describe, expect, it } from 'vitest'

import { ConfigError, readConfig } from '../src/config'

describe('readConfig', () => {
  it('reads the secret key and trims the trailing slash of the API address', () => {
    const config = readConfig({
      NELCOTA_SECRET_KEY: ' nc_sk_abc ',
      NELCOTA_API_URL: 'https://api.example.com/',
    })

    expect(config).toEqual({ apiUrl: 'https://api.example.com', secretKey: 'nc_sk_abc' })
  })

  it('defaults to the local API', () => {
    expect(readConfig({ NELCOTA_SECRET_KEY: 'nc_sk_abc' }).apiUrl).toBe('http://localhost:8080')
  })

  it('refuses publishable keys, missing keys and non-web addresses', () => {
    expect(() => readConfig({ NELCOTA_SECRET_KEY: 'nc_pk_abc' })).toThrow(ConfigError)
    expect(() => readConfig({})).toThrow(ConfigError)
    expect(() =>
      readConfig({ NELCOTA_SECRET_KEY: 'nc_sk_abc', NELCOTA_API_URL: 'file:///etc/passwd' }),
    ).toThrow(ConfigError)
  })
})
