import { describe, expect, it } from 'vitest'

import { CliError } from '../src/cli/cli-error'
import { DEFAULT_API_IMAGE, apiImageOf, renderComposeFile } from '../src/dev/compose-template'
import { parseEnvFile } from '../src/dev/dev-env-file'
import { generateDevEnvironment, renderEnvFile } from '../src/dev/dev-environment'
import { checkSlug, slugFromFolderName } from '../src/dev/dev-slug'
import { composeArguments } from '../src/dev/docker-compose'

const fakeRandomHex = (bytes: number): string => 'ab'.repeat(bytes)

describe('slugs', () => {
  it('turns folder names into valid slugs', () => {
    expect(slugFromFolderName('Meu App-2')).toBe('meu_app_2')
    expect(slugFromFolderName('Ação Rápida')).toBe('acao_rapida')
    expect(slugFromFolderName('2025-site')).toBe('app_2025_site')
    expect(slugFromFolderName('---')).toBe('app')
    expect(slugFromFolderName('x')).toBe('x_app')
    expect(slugFromFolderName('a'.repeat(60))).toHaveLength(40)
  })

  it('checks the API rule for --slug', () => {
    expect(checkSlug('acme_2')).toBe('acme_2')
    expect(() => checkSlug('ab')).toThrow(CliError)
    expect(() => checkSlug('1acme')).toThrow(CliError)
    expect(() => checkSlug('acme-corp')).toThrow(CliError)
  })
})

describe('dev environment file', () => {
  it('generates secrets the API accepts and reads them back', () => {
    const environment = generateDevEnvironment('nelcota-acme', fakeRandomHex)

    expect(environment.masterKeyHex).toMatch(/^[0-9a-f]{64}$/)
    expect(environment.adminToken.length).toBeGreaterThanOrEqual(32)
    expect(parseEnvFile(renderEnvFile(environment))).toEqual(environment)
  })

  it('uses the default ports', () => {
    const environment = generateDevEnvironment('nelcota-acme', fakeRandomHex)

    expect([environment.apiPort, environment.postgresPort, environment.mailpitPort]).toEqual([
      54320, 54322, 54324,
    ])
  })

  it('refuses edited values the stack could not use', () => {
    const text = renderEnvFile(generateDevEnvironment('nelcota-acme', fakeRandomHex))

    expect(() =>
      parseEnvFile(text.replace('NELCOTA_API_PORT=54320', 'NELCOTA_API_PORT=70000')),
    ).toThrow('NELCOTA_API_PORT')
    expect(() => parseEnvFile(text.replace(/ADMIN_TOKEN=.*/, 'ADMIN_TOKEN=short'))).toThrow(
      'ADMIN_TOKEN',
    )
    expect(() => parseEnvFile('')).toThrow(CliError)
  })
})

describe('compose file', () => {
  it('publishes on 127.0.0.1 only and sets the development flags', () => {
    const compose = renderComposeFile(DEFAULT_API_IMAGE)
    const published = compose.split('\n').filter((line) => line.trim().startsWith('- "'))

    expect(published.every((line) => line.includes('"127.0.0.1:'))).toBe(true)
    expect(compose).toContain('image: ghcr.io/nelcota/nelcota-api:latest')
    expect(compose).toContain('TENANT_SMTP_ALLOW_ANY_HOST: "true"')
    expect(compose).toContain('WEBHOOK_ALLOW_PRIVATE_HOSTS: "true"')
    expect(compose).toContain('DATABASE_PUBLIC_SSL_MODE: disable')
    expect(compose).toContain('DATABASE_PUBLIC_PORT: "${NELCOTA_POSTGRES_PORT:-54322}"')
    expect(compose).toContain('SMTP_URL: smtp://mailpit:1025')
  })

  it('takes the API image from NELCOTA_DEV_API_IMAGE', () => {
    expect(apiImageOf({})).toBe(DEFAULT_API_IMAGE)
    expect(apiImageOf({ NELCOTA_DEV_API_IMAGE: 'nelcota-api:dev' })).toBe('nelcota-api:dev')
    expect(() => apiImageOf({ NELCOTA_DEV_API_IMAGE: 'x\n  privileged: true' })).toThrow(CliError)
  })

  it('names the compose project and env file explicitly', () => {
    const environment = generateDevEnvironment('nelcota-acme', fakeRandomHex)

    expect(composeArguments(environment, ['ps'])).toEqual([
      'compose',
      '--project-name',
      'nelcota-acme',
      '--env-file',
      '.env',
      '--file',
      'docker-compose.yml',
      'ps',
    ])
  })
})
