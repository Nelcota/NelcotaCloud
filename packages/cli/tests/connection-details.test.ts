import { describe, expect, it } from 'vitest'

import {
  maskedConnectionString,
  parseConnectionDetails,
  reachableConnectionOf,
} from '../src/db/connection-details'

const ENABLED = {
  enabled: true,
  host: 'db.example.com',
  port: 6432,
  database: 'tenant_acme',
  user: 'nelcota_direct_acme',
  ssl_mode: 'require',
  has_password: true,
}

describe('connection details', () => {
  it('prints the connection string with [SENHA] in place of the password', () => {
    const connection = reachableConnectionOf(parseConnectionDetails(ENABLED))

    expect(connection).toBeDefined()
    expect(connection && maskedConnectionString(connection)).toBe(
      'postgresql://nelcota_direct_acme:[SENHA]@db.example.com:6432/tenant_acme?sslmode=require',
    )
  })

  it('encodes user and database names and brackets IPv6 hosts', () => {
    const details = parseConnectionDetails({ ...ENABLED, host: '::1', port: null, user: 'a@b' })
    const connection = reachableConnectionOf(details)

    expect(connection && maskedConnectionString(connection)).toBe(
      'postgresql://a%40b:[SENHA]@[::1]/tenant_acme?sslmode=require',
    )
  })

  it('has nothing to connect to when disabled or without a host', () => {
    const disabled = parseConnectionDetails({ ...ENABLED, enabled: false })
    const hostless = parseConnectionDetails({ ...ENABLED, host: null })

    expect(reachableConnectionOf(disabled)).toBeUndefined()
    expect(reachableConnectionOf(hostless)).toBeUndefined()
  })

  it('refuses a response in another shape', () => {
    expect(() => parseConnectionDetails({ ...ENABLED, port: '6432' })).toThrow('campo port')
  })
})
