# Console redesign, round 3: dev-first with hierarchy

The user's feedback: the last pass stripped the screens too much ("tu capou muito as telas").
NelcotaCloud is a Backend-as-a-Service: its users are developers. They want to SEE their data and
the technical details: ids, keys, endpoints, timestamps, logs, metrics, request ids, code. Earlier
feedback still applies: strong hierarchy, the main thing must stand out, no wall of equal panels.
Think Supabase / Vercel / Veloz dashboards: information-rich, organized, scannable.

Read first: `CLAUDE.md` (root: Project, Console structure, TypeScript rules, UI design, No
AI-style design), `DESIGN.md`, `crates/server/openapi.json` for every endpoint you show, and the
current code of your module (much of it is reusable: queries, api files, rules, dialogs).

## Page anatomy (every data page)

1. Header: PageHeader (title text-3xl) with one short line, the primary action (the only orange
   button), secondary actions as outline buttons, and an `ApiSheet` ("API" button,
   `@/shared/ui/api-sheet`) with real snippets for what the page does: SDK (`@nelcota/sdk`),
   `curl` and/or raw HTTP, filled with the project's real API URL (`API_BASE_URL` from
   `@/shared/api/api-base-url`), project id and publishable key where relevant. Never put the
   secret key value in a snippet; use a `$NELCOTA_SECRET_KEY` placeholder for admin calls.
2. A facts bar where it helps devs: `IdChip` (`@/shared/ui/id-chip`) for ids, endpoints, keys
   (e.g. "ID do projeto", "Endpoint REST /rest/v1/notes", "JWKS").
3. Key block: StatCards (label, big number, hint, sparkline/delta when data exists) or a status
   Notice when something needs attention.
4. Main content: full tables/logs with the columns devs need (ids in mono via IdChip or truncated
   mono with title, timestamps with Timestamp + exact time on hover, status badges), toolbar with
   search + filters + count, pagination/load more. Row details in a Sheet with ALL fields and raw
   JSON (CodeBlock) when the API returns more than the row shows.
5. Secondary panels below or in tabs (Tabs variant="line"): configuration, code, docs-like help.

## Visual rules

- Framed panels `rounded-xl border bg-card`; section titles text-base semibold; page title
  text-3xl; body text-sm; labels text-xs/sm muted; mono for technical values.
- One orange (primary) action per screen region; everything else outline/ghost.
- Grid with clear priority (e.g. 2/3 + 1/3), gap-6/8; no long column of equal boxes.
- Use `src/shared/ui/` compositions (PageHeader, Section isFramed, SettingsSection, StatCard,
  Notice, StatusBadge, StatusDot, PendingButton, TextField, TextAreaField, SwitchField,
  CheckboxField, SelectField, SearchField, SegmentedControl, ChoiceCards, DataList, CodeBlock,
  InlineCode, CopyButton, CopyableValue, IdChip, ApiSheet, Avatar, EmptyState, ConfirmButton,
  ConfirmDialog, StepDialog, ErrorAlert, LoadError, SavedNote, BackLink, Timestamp, Pagination)
  and shadcn primitives in `src/shared/ui/primitives/` (Table, Tabs + TabsContent, Sheet +
  SheetHeader, Dialog + DialogFooter, DropdownMenu, Tooltip, Popover, Badge, Skeleton,
  Collapsible, ToggleGroup). Tailwind only, no new dependencies.

## Rules

Keep every behavior, API call, validation, confirmation and accessibility. No `else`, no `!x`
(use `=== false`), no ternaries picking JSX or values (guard returns, small components, lookup
maps; `cn()` with `&&` ok), named exports, explicit return types, files ~150 lines, one component
per file, max 3 params. UI copy in Brazilian Portuguese, code in English. Touch only your
assigned folders; keep exports other modules import (grep before renaming/deleting).

Verify from `apps/console`: `npx tsc -b` (no errors from your folders), `npx oxlint <folders>`
(zero warnings), `npx oxfmt <folders>`. A dev server runs at http://localhost:5173 signed in
(project id e5fa6425-89fc-4bf3-b3fb-dc9a2cd37f32). Check your pages at 1440x900 and 375px in
your OWN new browser tab (close it at the end; other agents use other tabs), reset the viewport;
if Vite serves a stale module, `touch` the file. Remove any test data you create. Never sign out,
never block 127.0.0.1, do not start/stop servers, do not commit. Report files changed and the
final layout of each page.
