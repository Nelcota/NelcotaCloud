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
