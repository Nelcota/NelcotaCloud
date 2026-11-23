import type { components } from '@/shared/api/api-schema'

type Table = components['schemas']['TableOverview']

export const PROJECT = 'c443cc92-73b4-4c9d-92de-fcb0eace0524'

export const table: Table = {
  name: 'clientes',
  kind: 'table',
  rls_enabled: true,
  size_bytes: 8192,
  foreign_keys: [],
  indexes: [],
  policies: [],
  columns: [
    {
      name: 'id',
      type: 'bigint',
      nullable: false,
      default: null,
      is_identity: true,
      is_primary_key: true,
      is_unique: false,
    },
    {
      name: 'nome',
      type: 'text',
      nullable: false,
      default: null,
      is_identity: false,
      is_primary_key: false,
      is_unique: false,
    },
  ],
}
