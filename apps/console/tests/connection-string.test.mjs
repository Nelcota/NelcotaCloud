import assert from 'node:assert/strict'
import { test } from 'node:test'

import { maskedConnectionString } from '../src/modules/database/model/connection-string.ts'

const DETAILS = {
  user: 'nelcota_t_shop',
  host: 'db.nelcota.dev',
  port: 6432,
  database: 'tenant_shop',
  ssl_mode: 'require',
}

test('leaves the password out of the connection string', () => {
  assert.equal(
    maskedConnectionString(DETAILS),
    'postgresql://nelcota_t_shop:[SENHA]@db.nelcota.dev:6432/tenant_shop?sslmode=require',
  )
})

test('drops the port when the server names none', () => {
  assert.equal(
    maskedConnectionString({ ...DETAILS, port: null }),
    'postgresql://nelcota_t_shop:[SENHA]@db.nelcota.dev/tenant_shop?sslmode=require',
  )
})

test('escapes characters that would break the URL', () => {
  assert.match(maskedConnectionString({ ...DETAILS, user: 'a@b' }), /^postgresql:\/\/a%40b:/)
})
