---
name: NelcotaCloud Console
description: The engine room of a Brazilian Auth BaaS; neutral graphite surfaces, one signal mint.
colors:
  signal-mint: "oklch(0.79 0.14 162)"
  signal-mint-light: "oklch(0.5 0.11 162)"
  mint-ink-on-fill: "oklch(0.2 0.02 162)"
  mint-ink-on-fill-light: "oklch(0.99 0 0)"
  signal-ink: "oklch(0.8 0.13 162)"
  signal-ink-light: "oklch(0.47 0.1 162)"
  focus-ring: "oklch(0.79 0.14 162)"
  focus-ring-light: "oklch(0.6 0.12 162)"
  graphite-shell: "oklch(0.185 0 0)"
  graphite-floor: "oklch(0.215 0 0)"
  graphite-sidebar: "oklch(0.225 0 0)"
  graphite-panel: "oklch(0.255 0 0)"
  graphite-raised: "oklch(0.265 0 0)"
  graphite-control: "oklch(0.285 0 0)"
  graphite-hover: "oklch(0.29 0 0)"
  instrument-white: "oklch(0.985 0 0)"
  gauge-gray: "oklch(0.81 0 0)"
  hairline: "oklch(1 0 0 / 8%)"
  input-stroke: "oklch(1 0 0 / 12%)"
  alarm-red: "oklch(0.78 0.14 24)"
  logo-tile: "#18181b"
  paper-shell: "oklch(0.945 0 0)"
  paper-floor: "oklch(0.99 0 0)"
  paper-sidebar: "oklch(0.975 0 0)"
  paper-panel: "oklch(0.965 0 0)"
  paper-raised: "oklch(1 0 0)"
  paper-control: "oklch(0.945 0 0)"
  paper-hover: "oklch(0.935 0 0)"
  paper-ink: "oklch(0.17 0 0)"
  paper-gauge: "oklch(0.4 0 0)"
  paper-hairline: "oklch(0 0 0 / 9%)"
  paper-input-stroke: "oklch(0 0 0 / 12%)"
  alarm-red-light: "oklch(0.5 0.19 25)"
typography:
  headline:
    fontFamily: "Manrope Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: "2rem"
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "Manrope Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: "2.375rem"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.625rem"
    letterSpacing: "-0.015em"
  section-title:
    fontFamily: "Manrope Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: "1.5rem"
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Manrope Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 450
    lineHeight: "1.375rem"
  caption:
    fontFamily: "Manrope Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 450
    lineHeight: "1.125rem"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.625"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  2xl: "18px"
  3xl: "22px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.signal-mint}"
    textColor: "{colors.mint-ink-on-fill}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.graphite-panel}"
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.graphite-control}"
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  button-ghost:
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  button-destructive:
    textColor: "{colors.alarm-red}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  input:
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.xl}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.graphite-panel}"
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  settings-section:
    backgroundColor: "{colors.graphite-panel}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  dialog:
    backgroundColor: "{colors.graphite-raised}"
    rounded: "{rounded.3xl}"
    padding: "24px"
  menu:
    backgroundColor: "{colors.graphite-raised}"
    rounded: "{rounded.xl}"
    padding: "4px"
  nav-item:
    textColor: "{colors.instrument-white}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "0 12px"
    height: "36px"
  nav-item-current:
    backgroundColor: "{colors.graphite-hover}"
    textColor: "{colors.instrument-white}"
  rail-item:
    textColor: "{colors.gauge-gray}"
    rounded: "{rounded.xl}"
    height: "40px"
  badge:
    textColor: "{colors.instrument-white}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: "0 6px"
    height: "22px"
---

# Design System: NelcotaCloud Console

## Overview

**Creative North Star: "The Engine Room"**

The console is the room where a team keeps its app's Auth running: dim graphite walls, precise
instruments, and a single signal light for the thing that needs a hand on it. Nothing glows for
decoration. Surfaces step up in tiny tonal increments so the eye reads structure without lines
shouting, and the one mint is reserved for the primary action and "you are here".

Density is moderate and operational: every page opens with the same header rhythm, then cards
and settings sections laid on a 64rem column. Controls feel tactile and confident: they press
down under the finger, their focus ring is unmistakable, and the primary action stands out by
contrast, never by size or ornament. Dark is the default because this is a developer console;
the light theme is the same room with the lights on, not a different design.

**Key Characteristics:**

- Pure neutral graphite (chroma 0, no hue tint), dark by default, light one toggle away.
- One accent, Signal Mint (hue 162), used for the primary action, the current navigation icon and
  focus.
- Flat, tonal layering with hairline borders; shadows only on floating layers.
- Manrope everywhere, tight tracking on headlines and metrics; system mono for code and keys.
- Solar Linear icons (1.5px stroke, `currentColor`), 20px in controls and navigation.
- Tactile states: a 0.97 press scale, a visible focus ring, pointer cursors on everything clickable.

## Colors

Pure neutral graphite (every gray is chroma 0) with a single mint signal and a red that only
means danger. All values live in `apps/console/src/app/global.css` (`.dark` for dark, `:root` for
light); the name pairs below read dark / light.

### Primary

- **Signal Mint** (`signal-mint` / `signal-mint-light`; CSS `--primary`): the fill of the primary
  button, the avatar and the current step's number. In dark it is a light mint behind dark
  mint-tinted ink (`mint-ink-on-fill`, CSS `--primary-foreground`); in light it is a deeper mint
  behind near-white (`mint-ink-on-fill-light`). Both pairs keep 4.5:1. Its scarcity is what makes
  it read as "act here".
- **Signal Ink** (`signal-ink` / `signal-ink-light`; CSS `--primary-ink`, class
  `text-primary-ink`): mint used as text or icon on the page: the current section's icon, the
  current step's label, links. Never use `text-primary` for text: `--primary` is tuned as a fill,
  and `--primary-ink` is the one stepped for 4.5:1 against the page in each theme.
- **Focus Mint** (`focus-ring` / `focus-ring-light`; CSS `--ring`, `--sidebar-ring`): keyboard
  focus outlines and input focus rings (at 50% opacity for the inner ring). In dark it equals
  `--primary`; in light it is a lighter mint than the fill.

### Neutral

- **Graphite Shell** (`graphite-shell` / `paper-shell`; CSS `--shell`): the window frame around
  the page panel, the darkest layer.
- **Graphite Floor** (`graphite-floor` / `paper-floor`; `--background`): the page background.
- **Graphite Sidebar** (`graphite-sidebar` / `paper-sidebar`; `--sidebar`): the project sidebar,
  a half-step from the floor.
- **Graphite Panel** (`graphite-panel` / `paper-panel`; `--card`, and `--muted` in dark): cards,
  settings sections and the `surface` utility. In light, cards sit a step darker than the floor
  and carry a 7% black hairline (`--surface-edge`); in dark they need none.
- **Graphite Raised** (`graphite-raised` / `paper-raised`; `--popover`): popovers, menus and
  dialogs.
- **Graphite Control** (`graphite-control` / `paper-control`; `--secondary`): secondary buttons,
  muted fills, icon tiles.
- **Graphite Hover** (`graphite-hover` / `paper-hover`; `--accent`): hover and current-item fills
  in lists and navigation.
- **Instrument White** (`instrument-white` / `paper-ink`; `--foreground`): primary text.
- **Gauge Gray** (`gauge-gray` / `paper-gauge`; `--muted-foreground`): descriptions, labels,
  metadata, placeholders.
- **Hairline** (`hairline` / `paper-hairline`; `--border`): borders and dividers;
  `input-stroke` / `paper-input-stroke` (`--input`) for fields.
- **Logo Tile** (`logo-tile`): the fixed dark tile behind the white logo, in both themes. It is
  the one color outside `global.css`, set in `shared/ui/logo-mark.tsx`.

### Status

- **Alarm Red** (`alarm-red` / `alarm-red-light`; `--destructive`): destructive buttons (tinted
  10–20% fills with red text), invalid fields, the danger zone border (40% opacity).
- Success and warning badges use Tailwind emerald and amber at 10–15% fill with 700/400 text;
  they are status chips only, never surfaces.

### Named Rules

**The One Signal Rule.** Signal Mint appears on at most one action per view (the primary one) plus
the navigation's current icon and focus rings. A second mint button means one of them is wrong.
Icon tiles, switches and status rows are graphite (`bg-secondary` + `text-muted-foreground`, a
switch's on state is `foreground`), never mint.

**The AA Pair Rule.** Every text/background pair meets 4.5:1 in both themes:
`--primary-foreground` on `--primary` (dark ink on light mint in dark, near-white on deep mint
in light), `--primary-ink` on the page, and Alarm Red on its 10–20% tint.

**The Red Means Loss Rule.** Alarm Red is used only where something is revoked, deleted, banned
or invalid. Never for emphasis, never as a brand color.

## Typography

**Display Font:** Manrope Variable (with ui-sans-serif, system-ui)
**Label/Mono Font:** system monospace stack (ui-monospace, SFMono-Regular, Menlo)

**Character:** Manrope's geometric, slightly technical forms carry the whole interface; tight
negative tracking on large sizes makes headlines and numbers feel engineered. Mono is used only
for things a developer copies: commands, code, keys, IDs.

### Hierarchy

- **Headline** (700, `text-2xl` 1.5rem/2rem, -0.025em): the single `h1` of every page, via
  `PageHeader`. Step names in a `StepDialog` use the same size at 600.
- **Metric** (700, `text-3xl` 1.875rem/2.375rem, -0.025em): the big readings on overview cards
  ("2", "Plataforma").
- **Title** (600, `text-lg` 1.125rem/1.625rem, -0.015em): dialog and panel titles.
- **Section title** (600, `text-base` 1rem/1.5rem, -0.015em): settings section titles (`h2`);
  card titles use the same size at 500.
- **Body** (450, `text-sm` 0.875rem/1.375rem): almost all UI text (cards, dialogs, buttons,
  descriptions); descriptions in Gauge Gray, capped at 42rem (`max-w-2xl`) and `text-pretty`.
  Inputs use `text-base` on phones (no zoom on focus) and `text-sm` from `md`.
- **Caption** (450, `text-xs` 0.8125rem/1.125rem): metadata, hints, table header labels, badges
  and the slug under the project name; Gauge Gray unless it is a badge.
- **Code** (400, `text-xs` 0.8125rem, mono, `leading-relaxed`): commands, snippets, keys.

The scale lives in `global.css` as Tailwind's own `--text-*` tokens, each with its line height:
`text-xs` 13/18px, `text-sm` 14/22px, `text-base` 16/24px, `text-lg` 18/26px, `text-xl` 20/28px,
`text-2xl` 24/32px, `text-3xl` 30/38px. Components use these classes, never pixel sizes. Body
text is 450, not 400, because Manrope renders thin on screens (worst light on dark); headings
are 600 with -0.015em tracking by default (`h1`–`h4` in `global.css`), and the page headline and
metrics tighten to `tracking-tight`. The sign-in and status screens are the one place above the
scale: their title is `text-3xl`, `text-4xl` from `sm`.

### Named Rules

**The Sentence Case Rule.** Nothing is uppercase: headlines, labels, buttons, navigation and
captions all stay in sentence case. Hierarchy comes from size, weight and Gauge Gray.

## Layout

- **Shell:** the window is the shell color (`--shell`, the darkest layer). From `md`, a 64px icon
  rail sits on it at the left, and the rest is one panel inset 8px from the top, right and
  bottom: page background, an 18px radius (`rounded-2xl`) and a hairline border. The panel holds
  the 288px sidebar list (`w-72`, sidebar color, right hairline) and the page, which scrolls on
  its own so the rail, the list and the corners stay put. Below `md` there is no rail or list:
  a sticky 56px top bar (translucent, backdrop blur) opens a 22rem sheet with both.
- **Page column:** centered, max 64rem (`max-w-5xl`); a wide page (`data-wide-page`) lifts the
  limit. Side padding 16px, 24px from `sm`, 40px from `lg`; 24–32px top, 64px bottom.
- **Page rhythm:** `PageHeader` (title, optional description, actions right-aligned from `sm`,
  stacked below on phones), then content in cards, grids of cards, or stacked settings sections.
- **Spacing:** a 4px base. 16px inside cards (12px `sm`), 20px inside overview cards and
  settings sections, 24px inside dialogs, 12px around the sidebar list, 2px between nav items.
- **Grids:** overview cards use 1 column on phones, 2–3 on wider screens; tables scroll
  horizontally inside their container rather than breaking the page.
- **Tables:** the header row (`TableHeader`) has no fill, only a bottom hairline, with small
  semibold Gauge Gray labels; list tables (projects, users, database tables) lead a label with
  an 18px icon (`ColumnLabel`) where the data is not self-evident. Rows are separated by
  hairlines only (no vertical lines, no zebra stripes) and hover with a faint foreground fill.
  Identities (emails) never truncate away: they wrap, and secondary columns fold under them below `lg`.
- **Large data tables (activity, API keys):** one shared look from `shared/ui/table-styles.ts`
  and `TableHeadLabel`: 16px rows, a header on a faint dark tint, every label led by a 20px icon
  with a 12px gap, and cells padded so content starts under the label's text. Columns appear
  by the table's own width (container queries) and their content folds under the first column
  below it. The API keys page shows one table per kind ("Chaves do app" `publishable`, "Chaves
  do servidor" `secret`) with fixed column widths, so both tables line up. An unnamed key is
  called by its ending ("Chave …cc11"), as dialogs and menus call it. Below `@xl` the header
  row is for screen readers only and the name starts at the card's edge. During a rotation the
  "Revogar antiga" button sits beside the tag in the name cell; the actions column holds only
  the 32px menu. A replacement is named after the key it replaces ("Substitui …cc11"), and the
  page pairs keys from those names, so the rotation survives a reload. Sections and columns
  follow how often each is needed: app keys, server keys, revoked keys (collapsed), then the
  token signing key last, as the page's risk zone (its card has the red hairline ring of the
  danger tone and states the consequence beside "Trocar chave"). Columns read Nome, Chave,
  Último uso, Criada: last use answers "is this key still in use?" before its age does.
- **Section rows (`SectionRow`):** pages made of a few distinct sections (API keys) lay them on
  a 12-column grid by the page's own width: from `@4xl` the section's title and description take
  4 columns (3 from `@5xl`) and its content the rest, both on the same top line; below that they
  stack. Sections are split by a hairline, 32px apart. Tables in a section's right column use
  plain headings (no icons), so the width goes to the columns.
- **Spacing by level (8px scale, 4px steps inside components):** 48px under the page header,
  32px between sections, 24px between a section's title and its content when stacked, 8px
  between a title and its description. Internal never exceeds external: a card's 20px padding
  sits inside a 24px gap, so the card reads as one block with its title. Table rows are 48px of
  content plus the hairline (12px around a 24px text line; 8px around a 32px button), headers
  48px. Icon buttons are 32px for a mouse and 44px on touch screens (`pointer-coarse`). Section
  descriptions are 14px Gauge Gray; running text stays within 45–75 characters per line.
- **Activity page:** the one wide page (`data-wide-page` lifts the shell's column limit). Under
  the header sits one control row (search, a type menu, a period menu, then "Exportar CSV",
  all 44px on the card fill), then a one-line summary that ends with the page's answer:
  "Nenhum IP suspeito" in emerald or "N IPs suspeitos" in amber, with the rule in its tooltip.
  An amber warning lists the suspicious IPs only when there are any. Below `@3xl` the row folds
  to search on top and the two menus (short labels) plus an icon-only export beneath.
- **Activity table:** split by day: each day opens with a `rowgroup` heading row spanning every
  column (no fill, semibold Gauge Gray date), so rows show only the time. The header row sits on
  a faint dark tint (`bg-black/[0.03]`, `dark:bg-black/10`) and every label leads with a 20px
  icon and a 12px gap, the event icon's size; the Usuário and Origem cells are indented by that
  offset so their content starts under the label's text. All cells align to the row's top.
  Refused logins (and folded bursts of them) take the amber threat tone; red stays for loss
  (ban, deletion). The table is a size container: Hora shows from `@xl`, Usuário from `@2xl`,
  Origem from `@3xl`; below each, its content moves into the event cell (the time beside the
  title, the rest in muted lines under it), so nothing is hidden. The filter magnifier beside
  an email or IP shows on row hover and is always visible on touch screens.

## Elevation & Depth

Flat by default. Depth is tonal: shell → floor → sidebar → panel → raised, each a few lightness
points apart. Raised surfaces (`surface`: cards, settings sections, empty states) have no border
in dark and a 7% black hairline (`--surface-edge`) in light, where the tones sit too close.
Shadows exist only on floating layers: menus and sheets (`shadow-lg`) and the floating flash
notice (`shadow-md`). Dialogs float on a 50% black overlay with a light blur and carry a 10%
foreground ring instead of a shadow.

### Named Rules

**The Grounded Rule.** Anything that sits on the page is flat. A shadow means "this floats above
the page and will go away" (menu, dialog, sheet), never "this is important".

## Shapes

Rounded and consistent, all derived from `--radius` (10px). Buttons, switches and avatars are
full pills or circles; inputs, menus, code blocks, alerts, choice cards, sidebar items and rail
tiles use 14px (`rounded-xl`); raised surfaces (cards, settings sections, empty states) and the
shell panel use 18px (`rounded-2xl`); dialogs use 22px (`rounded-3xl`); badges, checkboxes and
small icon buttons use 8px (`rounded-md`); menu items and tooltips use 10px (`rounded-lg`).
Every border is solid. The logo always sits on its own dark rounded tile (10px, 14px in the
rail).

## Components

### Buttons

Tactile and confident: they press, they ring, they never decorate.

- **Shape:** full pill, 36px tall by default (24px `xs`, 32px `sm`, 40px `lg`; square icon
  buttons 28/32/36/40px), 14px side padding (8px `xs`, 12px `sm`, 16px `lg`), 14px medium text
  (13px on `xs`), 18px icons (16px on `xs`/`sm`) with an 8px gap.
- **Primary:** Signal Mint fill with `--primary-foreground` text (dark ink in dark, near-white in
  light); hover drops to 85% opacity.
- **Outline:** Graphite Panel fill with a hairline border; hover turns to Graphite Hover.
- **Secondary:** Graphite Control fill, no border; hover mixes in 5% foreground.
- **Ghost:** no fill until hover (Graphite Hover).
- **Destructive:** Alarm Red text on a 10–20% red tint, never a solid red block, in the
  confirmation dialog too. Destructive actions always go through `ConfirmButton`/`ConfirmDialog`,
  whose title names the exact target ("Revogar a publishable key …fa82?") and whose description
  says what breaks. Irreversible deletions (a whole project) pass `confirmationText`: the user
  types the slug before the button enables.
- **States:** press scales to 0.97 over 120ms and nudges down 1px (only without reduced motion); focus shows a 3px
  50% mint ring (`--ring`) plus the global 2px outline; disabled is 50% opacity with `not-allowed`; busy
  uses `cursor: progress`.

### Chips / Badges

One component (`Badge`, `badgeVariants`) for every pill, including the confirmation preview
and the sidebar count. The variant is the meaning, never decoration:

- **neutral** (10% foreground tint): what something is: a role, a key type, "Esta sessão",
  "Padrão", "MFA", a count. Roles use `RoleBadge`: both neutral, the owner with the crown that
  "Tornar dono" uses.
- **success** (emerald), **warning** (amber), **destructive** (Alarm Red): a state that is
  fine, needs attention, or blocks.
- **muted** (hairline outline, Gauge Gray text): a state that is off: revoked, disabled.

Shape: 8px radius (`rounded-md`, not a pill), 22px tall, 6px side padding, 13px medium text
(`text-xs`), optional 14px leading icon.
Mint is never a pill color: it stays for actions.

### Cards / Containers

- **Corner Style:** 18px (`rounded-2xl`, from the `surface` utility).
- **Background:** Graphite Panel.
- **Shadow Strategy:** none; no border in dark, a 7% hairline in light (`--surface-edge`).
- **Internal Padding:** 16px (cards, 12px when `sm`), 20px (overview cards, settings sections).
- **Settings section:** title, Gauge Gray description, fields, then a footer (top hairline, no
  fill, 14px vertical padding) holding Save on the right. The `danger` tone adds a 35% red ring.
- **Overview cards:** at least 144px tall; a muted 20px icon beside the title (no tile), a sentence-case label, a
  metric, a description, then links at the bottom separated by a hairline. While loading, the
  metric is one placeholder and the description is hidden, never "Carregando…" next to it.
- **No nested boxes:** a form or row inside a card or settings section is separated by a top
  hairline (`border-t pt-4`), never wrapped in its own bordered box.

### Inputs / Fields

- **Style:** 36px tall, 14px radius, 12px side padding, a 1px `--input` stroke (12% white in
  dark, 12% black in light), transparent fill (4% foreground tint in dark), placeholder in Gauge
  Gray.
- **Choices:** choice cards and check cards are 14px-radius bordered rows (16px padding, 12px
  vertical on check cards) with a 20px check; switches are 40×24px pills (32×20px `sm`).
- **Focus:** border turns Focus Mint plus a 3px 50% mint ring.
- **Error / Disabled:** red border with a 20–40% red ring; disabled at 50% opacity.
- Fields always come wrapped in `FormField` (label, control, hint/error).

### Navigation

- **Rail (64px, on the shell):** top to bottom, the logo on a 36px tile with a 12px API status
  dot (emerald / red / gray, ringed in the shell color; its words are screen-reader only), the
  Projetos link, a 24px divider, one 40px avatar tile per project (14px radius, a 4px foreground
  bar on the rail's left edge marks the open one), and the 36px account avatar (Signal Mint with
  initials) at the foot. Rail links are 40px tiles with 22px icons and a tooltip for their
  name; hover fills 8% foreground, current 10% with the Bold icon. The account menu opens to the
  right, 256px wide: Minha conta, theme, Sair.
- **Sidebar list (288px, 12px padding):** inside a project, a 48px header with the project name
  (16px bold) over its slug in mono, then the pages in groups (none, Autenticação, Dados,
  Projeto; 14px semibold headings). Outside a project, the same column lists the console's own
  pages under "Nelcota". Items are at least 36px tall, 14px radius, 12px side padding, 20px
  icons with a 12px gap, 14px medium text, 2px apart. Hover and current fill with Graphite
  Hover; the current item is semibold with a Signal Ink icon in Solar's Bold variant. Usuários
  carries a live count pill (neutral tint, tabular numbers, hidden at zero).
- **Foot:** the MFA reminder card (a `surface` with 12px padding) while the console account has
  MFA off: "Recomendado" amber tag, a 32px dismiss button remembered per browser, and a small
  "Ativar MFA" outline button.
- **Top bar (phones only):** the menu button and the current page's name.
- **Tab title:** every page names the browser tab "Página · Projeto · NelcotaCloud", so tabs
  tell apart and screen readers announce where a navigation landed.
- **Mobile:** the 40px menu button opens a 22rem sheet holding the rail and the sidebar list.

### Empty State

A `surface` (18px radius, no dashed border), centered, 56px vertical and 24px side padding: a
semibold title led by a small muted line icon on the same line (no
icon tile stacked above the heading), one sentence explaining what will appear here, and the
action that adds the first item.

### One-Time Secret

Secret keys and webhook signing secrets are returned once; publishable keys are public, so the
key list shows them in full with Copy and "Conectar seu app" fills them in. A secret the API
returns once is a warning, not information: amber border and 10% amber tint, a
triangle icon, a heading that says to copy it now, the value in a mono block with Copy focused,
and an explicit "Já guardei a chave" dismissal. While it is on screen, `SecretLeaveGuard` asks
before any navigation or tab close, naming what would be lost (`subject`). The value itself is never inside a live region.

### Dialogs

- **Size:** 672px wide (`sm:max-w-2xl`), 22px radius, 24px padding, 20px gaps, an 18px semibold
  title, a 32px ghost close button 16px from the corner; the footer spans the full width with a
  top hairline and 16px vertical padding, no fill. Taller than the screen, the dialog scrolls
  inside. The profile photo editor is the one wider dialog (768px), for the crop area.
- **Menus:** 14px radius, 4px padding, a 10% foreground ring and `shadow-lg`; items at least
  36px tall with a 10px radius.
- **Confirmations show the change:** a hairline row with the target's icon and name, then its
  current state struck out, an arrow and the new state (Alarm Red badge when destructive, a
  neutral badge otherwise), played once on open (`animate-change-*`). The resting styles are
  the final frame, so reduced motion shows the result directly. Screen readers hear "Ativa passa
  a Revogada". An action that changes two people (handing a project over) shows both rows,
  yours included, and confirms with a neutral (secondary) button instead of the routine mint.

### Guided Dialogs

Every dialog that creates or configures something is a `StepDialog`: a wide dialog (up to
76rem, 46rem tall or the screen minus 32px, fixed, so moving between steps never resizes or moves it) with a header (title
and "Passo X de N") and three columns from `lg`:

- **Steps** (13–15rem): the steps as a vertical list; done ones checked and clickable to go
  back, the current one on a 10% mint fill (`bg-primary/10`) in Signal Ink with a Signal Mint
  number.
- **Step** (the rest): the step's name (24px semibold), one sentence on what to do, then its
  fields. It is a size container: choice cards and field rows go side by side only when the
  column is wide enough, never by screen width. Only this column scrolls.
- **Preview** (17–22rem, faint muted fill): a small "O que vai acontecer" label, the step's
  illustration with its one-sentence caption (a step without one keeps the last), then what has
  been filled in so far (`summary`), which grows as the steps are answered. Nothing is said twice.

The forward button stays disabled while the step lacks something, and says why beside it
(`missing`: "Escolha um provedor"); while the last step runs it reads its working label
("Criando chave…"). An error scrolls into view and takes focus. A step that would only confirm
prefilled values is left out (SMTP presets skip "Servidor"), and a task with one field is a
one-step confirmation dialog, not a guided one (inviting someone).

The footer holds Cancelar/Voltar on the left and the large primary button on the right, as wide
as the preview column ("Continuar →", then the action: "Criar chave"). Below `lg` the dialog is a
single column: a compact progress row, then the step; the illustration is left out so the choice
stays above the fold. Continuar
stays disabled until the step is filled; Enter continues; going back keeps what was typed. A
last "Revisar" step (`ReviewList`) appears when there is more than one thing to check. Choices
between a few options are `ChoiceCards`, multiple choices are check cards in the same style
(`CheckField`); never native selects or checkboxes. A selected card is marked in the foreground
colour with a filled check, never in mint (mint stays for the action). Confirmations stay one
step; only those whose effect reaches others (revoking a key, deleting an endpoint or project,
blocking a user, removing a provider or member) carry an illustration, and destructive ones are
`alertdialog`s. Lighter ones (removing a photo, ending your own session, rotating a secret,
changing a role) are title, sentence and change preview only.

### Illustrations

`Illustration` shows drawn art for its `name` once a file is mapped in `ILLUSTRATION_ART`
(`public/illustrations/`), and until then the `FlowDiagram` it wraps: two to four parts drawn
with the console's own Solar icons on hairline tiles (the part the dialog is about outlined
in the foreground colour, a part that stops existing dashed and struck out) joined by labelled arrows. A flowing
link plays a small Signal Mint dot along it twice, then stops (hidden with reduced motion); a cut link is a dashed red
line with a close icon. Each illustration carries a one-sentence `description` for screen
readers; the picture itself is hidden from them.

### Forgiving Fields

People never type what the console can write for them. Web addresses use `UrlField`, which
shows `https://` in front and lets `withHttps` add it (an explicit `http://localhost` is kept).
SMTP is asked as provider, server, port, security, login and sender, never as a URL. Slugs are
generated from the name and only edited on request.

### Feedback

- **Success:** `showFlash` puts one sentence in the green notice (`FlashNotice`,
  a polite live region floating at the bottom center of the page panel, out of the page's flow, so
  it is seen wherever the action was and never shifts or covers the page) for six
  seconds, optionally with the next step as a link ("Revisar chaves de API" after removing
  someone); it survives navigation, so "Você saiu de Acme Loja" shows on the projects list.
- **Failure:** a confirmation whose action can fail returns a promise: the dialog stays open and
  busy until the API answers and shows the error inside itself, next to the decision.
- **Errors read in Portuguese:** `ErrorAlert` passes every API and SDK error through
  `describeError` (`shared/api`), which maps the API's stable codes (and its known messages for
  generic codes) to a sentence that names the problem and the way out. A page whose data failed
  to load shows `LoadError` with "Tentar de novo" and no skeleton; refusals (4xx) are not retried.
- **Rules before errors:** an action a rule forbids (the sole owner leaving) is shown disabled,
  with the reason once below the items at full contrast (never inside the faded item), and the
  reason names a reachable next step.

### Readout Strip

Instrument readouts (the overview's "Isolamento do projeto"): a bordered panel split into
columns by hairlines; each column has a sentence-case caption label with a 14px icon, the value in
mono, and one muted sentence of context. Use it for facts about the project, never for marketing
claims.

### Code Block

`CodeBlock` (mono 13px on a 70% shell fill, no border, 14px radius, 16px padding) inside numbered steps
("Conectar seu app"), each with a `CopyButton` (outline, small) on the right. Code is colored by
the small tokenizer in `shared/lib/highlight-code.ts` (TypeScript and shell only, enough for the
console's own snippets) with the theme's code tokens, each at least 4.5:1 on the block in both
themes: `--code-keyword` violet, `--code-string` green, `--code-function` blue,
`--code-property` amber, `--code-muted` gray for punctuation and comments. Values to copy
as they are (keys, callback URLs) use `CopyableValue` (plain mono, wraps, Copy on the right).

### Icons

Solar, Linear style only (`@iconify-json/solar`), imported per icon as React components:
`import Key from '~icons/solar/key-linear'` (compiled at build time by `unplugin-icons` with the
console's own `icon-compiler.ts`). Icons inherit `currentColor`, are sized with `size-*` classes
(20px default, 16px in readout labels and small buttons), and are `aria-hidden` unless given an `aria-label`.
Never mix in another icon set or another Solar style; the one exception is the current
navigation item, which swaps to the same icon's Bold variant.

## Do's and Don'ts

### Do:

- **Do** start every page with `PageHeader` and keep one `h1` per page.
- **Do** keep Signal Mint to the primary action, the current nav icon and focus (The One Signal
  Rule).
- **Do** express hierarchy with tonal steps and hairlines before reaching for a shadow.
- **Do** give every interactive element a pointer cursor, a hover fill, a 0.97 press and a visible
  focus ring; respect `prefers-reduced-motion`.
- **Do** design every screen for both themes, dark first, and keep text at WCAG AA contrast.
- **Do** use mono only for things the user copies or reads as an identifier (commands, code, keys,
  IDs, database names).
- **Do** name the target of every destructive confirmation and say what breaks.
- **Do** show the logo only on its dark tile, unaltered.

### Don't:

- **Don't** add a second accent color or use mint for decoration, gradients or large fills.
- **Don't** use solid red buttons; destructive actions are red text on a red tint, behind a
  confirmation.
- **Don't** use `text-primary` for text or icons; use `text-primary-ink`.
- **Don't** import `lucide-react` (shadcn's default): swap any icon a new shadcn component brings
  for its Solar Linear equivalent.
- **Don't** put shadows on cards or anything that sits on the page.
- **Don't** uppercase anything; captions included, the console is sentence case throughout.
- **Don't** redraw, recolor or place the logo directly on a light surface.
