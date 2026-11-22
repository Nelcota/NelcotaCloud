/** Starting points for a new project's first statements; picking one only fills the editor. */
export type SqlExample = { label: string; sql: string }

const CREATE_TABLE = `create table public.notes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid(),
  body text not null,
  created_at timestamptz not null default now()
);

-- Toda tabela nova em public já nasce com RLS ligada.
alter table public.notes enable row level security;
`

const OWN_ROWS_POLICY = `create policy own_rows on public.notes
  for all
  to nelcota_authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
`

const LIST_TABLES = `select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
`

const COUNT_ROWS = `select count(*) from public.notes;
`

export const SQL_EXAMPLES: readonly SqlExample[] = [
  { label: 'Criar tabela com RLS', sql: CREATE_TABLE },
  { label: 'Política: só as próprias linhas', sql: OWN_ROWS_POLICY },
  { label: 'Listar tabelas', sql: LIST_TABLES },
  { label: 'Contar linhas', sql: COUNT_ROWS },
]
