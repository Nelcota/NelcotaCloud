import { isObjectName } from '@/modules/database/components/object-name'
import {
  type ColumnType,
  type OnDeleteAction,
  isIntegerType,
} from '@/modules/database/components/column-types'
import type { components } from '@/shared/api/api-schema'

type ColumnDefinition = components['schemas']['ColumnDefinition']

/** A column another table's column can point to: its table's primary key or a unique column. */
export type ReferenceTarget = { table: string; column: string }

/** One column being written in a form, before it becomes the API's `ColumnDefinition`. */
export type ColumnDraft = {
  /** Tells the form's rows apart while names are still being typed. */
  key: number
  name: string
  type: ColumnType
  isArray: boolean
  isNullable: boolean
  defaultValue: string
  isPrimaryKey: boolean
  isIdentity: boolean
  isUnique: boolean
  reference: ReferenceTarget | null
  onDelete: OnDeleteAction
}

let lastKey = 0

function nextKey(): number {
  lastKey += 1

  return lastKey
}

export function blankColumnDraft(): ColumnDraft {
  return {
    key: nextKey(),
    name: '',
    type: 'text',
    isArray: false,
    isNullable: true,
    defaultValue: '',
    isPrimaryKey: false,
    isIdentity: false,
    isUnique: false,
    reference: null,
    onDelete: 'no_action',
  }
}

/** What most tables start with: `id bigint`, numbered automatically, as the primary key. */
export function idColumnDraft(): ColumnDraft {
  return {
    ...blankColumnDraft(),
    name: 'id',
    type: 'bigint',
    isNullable: false,
    isPrimaryKey: true,
    isIdentity: true,
  }
}

export function canBeIdentity(draft: ColumnDraft): boolean {
  return isIntegerType(draft.type) && draft.isArray === false
}

/** Keeps a draft coherent: identity only on integers, keys and identities never null. */
export function normalizedDraft(draft: ColumnDraft): ColumnDraft {
  const isIdentity = draft.isIdentity && canBeIdentity(draft)

  if (isIdentity || draft.isPrimaryKey) {
    return { ...draft, isIdentity, isNullable: false }
  }

  return { ...draft, isIdentity }
}

export function isDraftComplete(draft: ColumnDraft): boolean {
  return isObjectName(draft.name)
}

/** False when two columns share a name; the database would refuse the table. */
export function haveDistinctNames(drafts: readonly ColumnDraft[]): boolean {
  const names = drafts.map((draft) => draft.name.trim())

  return new Set(names).size === names.length
}

export function toColumnDefinition(draft: ColumnDraft): ColumnDefinition {
  return {
    name: draft.name.trim(),
    type: typeName(draft),
    nullable: draft.isNullable,
    default: defaultOf(draft),
    identity: draft.isIdentity,
    primary_key: draft.isPrimaryKey,
    unique: draft.isUnique,
    references: referenceOf(draft),
  }
}

function typeName(draft: ColumnDraft): string {
  if (draft.isArray) {
    return `${draft.type}[]`
  }

  return draft.type
}

function defaultOf(draft: ColumnDraft): string | null {
  const value = draft.defaultValue.trim()

  if (value === '' || draft.isIdentity) {
    return null
  }

  return value
}

function referenceOf(draft: ColumnDraft): ColumnDefinition['references'] {
  if (draft.reference === null) {
    return null
  }

  return { ...draft.reference, on_delete: onDeleteOf(draft.onDelete) }
}

/** `no_action` is the database's default, so it is left out. */
function onDeleteOf(action: OnDeleteAction): string | null {
  if (action === 'no_action') {
    return null
  }

  return action
}
