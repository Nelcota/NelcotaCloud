import { execFileSync } from 'node:child_process'
import { mkdtempDisposableSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const npm = process.env.npm_execpath

if (npm === undefined) {
  throw new Error('Run this check through npm run test:package.')
}

using consumer = mkdtempDisposableSync(join(tmpdir(), 'nelcota-sdk-consumer-'))
const folder = consumer.path
const pack = packedPackage(
  JSON.parse(
    execFileSync(process.execPath, [npm, 'pack', '--json', '--pack-destination', folder], {
      cwd: root,
      encoding: 'utf8',
    }),
  ),
)

writeFileSync(join(folder, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
execFileSync(
  process.execPath,
  [
    npm,
    'install',
    '--offline',
    '--no-audit',
    '--no-fund',
    '--ignore-scripts',
    join(folder, pack.filename),
  ],
  { cwd: folder, stdio: 'inherit' },
)

const entry = join(folder, 'consumer.mts')
writeFileSync(
  entry,
  `import { DatabaseClient, OAuthApi, createClient, memoryStorage, verifyWebhook } from '@nelcota/sdk'
import type { NelcotaClient, QueryResult } from '@nelcota/sdk'

const client: NelcotaClient = createClient({
  url: 'https://api.example.test',
  publishableKey: 'nc_pk_fixture',
  storage: memoryStorage(),
  fetch: async () => Response.json([{ id: 1 }]),
})
const result: QueryResult<{ id: number }[]> =
  await client.database.from<{ id: number }>('items').select('id').execute()
if ((client.database instanceof DatabaseClient) === false || (client.auth.oauth instanceof OAuthApi) === false) {
  throw new Error('Client classes differ from the package exports.')
}
if (result.data[0]?.id !== 1 || typeof verifyWebhook !== 'function') {
  throw new Error('The installed SDK did not return the expected result.')
}
client.dispose()
`,
)
execFileSync(
  process.execPath,
  [
    join(root, 'node_modules/typescript/bin/tsc'),
    '--noEmit',
    '--strict',
    '--target',
    'esnext',
    '--module',
    'nodenext',
    entry,
  ],
  { cwd: folder, stdio: 'inherit' },
)
execFileSync(process.execPath, [entry], { cwd: folder, stdio: 'inherit' })

/** npm 12 keys the pack report by package name; earlier versions return a list. */
function packedPackage(report) {
  const packs = packsOf(report)

  if (packs.length !== 1 || typeof packs[0]?.filename !== 'string') {
    throw new Error('npm pack did not report exactly one package.')
  }

  return packs[0]
}

function packsOf(report) {
  if (Array.isArray(report)) {
    return report
  }

  return Object.values(report)
}
