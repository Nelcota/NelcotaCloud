import type { TableQuery } from './table-query'

/**
 * The shape of a project's database for the typed client. `nelcota gen types` (or the console's
 * "Tipos TypeScript") writes a `Database` type of this shape: pass it as
 * `createClient<Database>(...)` and `from`, `insert`, `update` and `rpc` follow the schema.
 */
export type GenericTable = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
}

export type GenericView = { Row: Record<string, unknown> }

export type GenericFunction = { Args: Record<string, unknown>; Returns: unknown }

export type GenericSchema = {
  Tables: Record<string, GenericTable>
  Views: Record<string, GenericView>
  Functions: Record<string, GenericFunction>
  Enums: Record<string, string>
}

/** Any database: names are plain strings and rows are records, as without generated types. */
export type GenericDatabase = { public: GenericSchema }

type PublicSchema<Database extends GenericDatabase> = Database['public']
type Tables<Database extends GenericDatabase> = PublicSchema<Database>['Tables']
type Views<Database extends GenericDatabase> = PublicSchema<Database>['Views']
type Functions<Database extends GenericDatabase> = PublicSchema<Database>['Functions']

/** A table or view `from` accepts. */
export type RelationName<Database extends GenericDatabase> = (
  | keyof Tables<Database>
  | keyof Views<Database>
) &
  string

/** What a read returns per row: a table's or a view's columns. */
export type RowOf<
  Database extends GenericDatabase,
  Name extends RelationName<Database>,
> = Name extends keyof Tables<Database>
  ? Tables<Database>[Name]['Row']
  : Name extends keyof Views<Database>
    ? Views<Database>[Name]['Row']
    : never

/** What an insert takes; views take nothing. */
export type InsertOf<
  Database extends GenericDatabase,
  Name extends RelationName<Database>,
> = Name extends keyof Tables<Database> ? Tables<Database>[Name]['Insert'] : never

/** What an update takes; views take nothing. */
export type UpdateOf<
  Database extends GenericDatabase,
  Name extends RelationName<Database>,
> = Name extends keyof Tables<Database> ? Tables<Database>[Name]['Update'] : never

/** A function `rpc` accepts. */
export type FunctionName<Database extends GenericDatabase> = keyof Functions<Database> & string

export type ArgsOf<
  Database extends GenericDatabase,
  Name extends FunctionName<Database>,
> = Functions<Database>[Name]['Args']

export type ReturnsOf<
  Database extends GenericDatabase,
  Name extends FunctionName<Database>,
> = Functions<Database>[Name]['Returns']

/** The typed query of one table or view of `Database`. */
export type RelationQuery<
  Database extends GenericDatabase,
  Name extends RelationName<Database>,
> = TableQuery<RowOf<Database, Name>, InsertOf<Database, Name>, UpdateOf<Database, Name>>

/**
 * What `from` returns: the row named in `from<Post>('posts')` when one is given, as before typed
 * databases existed; otherwise the row `Database` describes for that table.
 */
export type ChosenQuery<
  Database extends GenericDatabase,
  Name extends RelationName<Database>,
  Row extends Record<string, unknown>,
> = [Row] extends [never] ? RelationQuery<Database, Name> : TableQuery<Row>

/** What `rpc` answers: the type named in `rpc<number>('add')`, or the function's own result. */
export type ChosenResult<
  Database extends GenericDatabase,
  Name extends FunctionName<Database>,
  Result,
> = [Result] extends [never] ? ReturnsOf<Database, Name> : Result
