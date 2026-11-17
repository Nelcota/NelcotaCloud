---
name: NelcotaCloud Console
description: The engine room of a Brazilian Auth BaaS; graphite surfaces, one signal blue.
colors:
  signal-blue: "oklch(0.55 0.2 262)"
  signal-blue-light: "oklch(0.53 0.2 262)"
  signal-ink: "oklch(0.77 0.13 262)"
  focus-ring: "oklch(0.7 0.15 262)"
  graphite-floor: "oklch(0.21 0.007 286)"
  graphite-panel: "oklch(0.24 0.007 286)"
  graphite-raised: "oklch(0.26 0.007 286)"
  graphite-sidebar: "oklch(0.225 0.007 286)"
  graphite-control: "oklch(0.275 0.008 286)"
  graphite-hover: "oklch(0.29 0.008 286)"
  instrument-white: "oklch(0.96 0.003 286)"
  gauge-gray: "oklch(0.76 0.012 286)"
  hairline: "oklch(1 0 0 / 10%)"
  input-stroke: "oklch(1 0 0 / 14%)"
  alarm-red: "oklch(0.8 0.13 24)"
  logo-tile: "#18181b"
  paper-floor: "oklch(0.985 0.002 286)"
  paper-panel: "oklch(1 0 0)"
  paper-ink: "oklch(0.2 0.006 286)"
  paper-gauge: "oklch(0.48 0.012 286)"
  paper-hairline: "oklch(0.905 0.005 286)"
  alarm-red-light: "oklch(0.48 0.2 25)"
typography:
  headline:
    fontFamily: "Manrope Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: "2.5rem"
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "Manrope Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: "2.75rem"
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontFamily: "Manrope Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  label:
    fontFamily: "Manrope Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
    letterSpacing: "0.025em"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.625"
rounded:
  sm: "4.8px"
  md: "6.4px"
  lg: "8px"
  xl: "11.2px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.instrument-white}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.graphite-control}"
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  button-ghost:
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  button-destructive:
    textColor: "{colors.alarm-red}"
    rounded: "{rounded.lg}"
    padding: "0 12px"
    height: "36px"
  input:
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.lg}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.graphite-panel}"
    textColor: "{colors.instrument-white}"
    rounded: "{rounded.xl}"
    padding: "16px"
  settings-section:
    backgroundColor: "{colors.graphite-panel}"
    rounded: "{rounded.xl}"
    padding: "20px"
  nav-item:
    textColor: "{colors.gauge-gray}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "40px"
  nav-item-current:
    backgroundColor: "{colors.graphite-hover}"
    textColor: "{colors.instrument-white}"
  badge:
    backgroundColor: "{colors.graphite-control}"
    textColor: "{colors.instrument-white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "20px"
---

# Design System: NelcotaCloud Console

## Overview

**Creative North Star: "The Engine Room"**

The console is the room where a team keeps its app's Auth running: dim graphite walls, precise
instruments, and a single signal light for the thing that needs a hand on it. Nothing glows for
decoration. Surfaces step up in tiny tonal increments so the eye reads structure without lines
shouting, and the one blue is reserved for the primary action and "you are here".

Density is moderate and operational: every page opens with the same header rhythm, then cards
and settings sections laid on a 72rem column. Controls feel tactile and confident: they press
down under the finger, their focus ring is unmistakable, and the primary action stands out by
contrast, never by size or ornament. Dark is the default because this is a developer console;
the light theme is the same room with the lights on, not a different design.

**Key Characteristics:**

- Graphite neutrals tinted toward violet-blue (hue 286), dark by default, light one toggle away.
- One accent, Signal Blue, used for the primary action, the current navigation icon and focus.
- Flat, tonal layering with hairline borders; shadows only on floating layers.
- Manrope everywhere, tight tracking on headlines and metrics; system mono for code and keys.
- Solar Linear icons (1.5px stroke, `currentColor`), 20px in controls and navigation.
- Tactile states: a 0.97 press scale, a visible focus ring, pointer cursors on everything clickable.

## Colors

Cool graphite neutrals with a single saturated blue signal and a red that only means danger.

### Primary

- **Signal Blue** (`signal-blue` in dark, `signal-blue-light` in light; CSS `--primary`): the fill
  of the primary button and the avatar, always behind white text (4.9:1 in dark, 5.3:1 in light).
  Its scarcity is what makes it read as "act here".
- **Signal Ink** (`signal-ink` in dark, `signal-blue-light` in light; CSS `--primary-ink`, class
  `text-primary-ink`): blue used as text or icon on the page: the current section's icon, the
  current project check, links. Never use `text-primary` for text: the fill blue is too dark to
  read on graphite.
- **Focus Blue** (`focus-ring`): keyboard focus outlines and input focus rings (at 50% opacity
  for the inner ring).

### Neutral

- **Graphite Floor** (`graphite-floor` / `paper-floor`): the page background.
- **Graphite Sidebar** (`graphite-sidebar`): the project sidebar, a half-step above the floor.
- **Graphite Panel** (`graphite-panel` / `paper-panel`): cards and settings sections.
- **Graphite Raised** (`graphite-raised`): popovers, menus and dialogs.
- **Graphite Control** (`graphite-control`): secondary buttons, muted fills, icon tiles.
- **Graphite Hover** (`graphite-hover`): hover and current-item fills in lists and navigation.
- **Instrument White** (`instrument-white` / `paper-ink`): primary text.
- **Gauge Gray** (`gauge-gray` / `paper-gauge`): descriptions, labels, metadata, placeholders.
- **Hairline** (`hairline` / `paper-hairline`): borders and dividers; `input-stroke` for fields.
- **Logo Tile** (`logo-tile`): the fixed dark tile behind the white logo, in both themes.

### Status

- **Alarm Red** (`alarm-red` / `alarm-red-light`): destructive buttons (tinted 10–20% fills with
  red text), invalid fields, the danger zone border (40% opacity).
- Success and warning badges use Tailwind emerald and amber at 10–15% fill with 700/400 text;
  they are status chips only, never surfaces.

### Named Rules

**The One Signal Rule.** Signal Blue appears on at most one action per view (the primary one) plus
the navigation's current icon and focus rings. A second blue button means one of them is wrong.
Icon tiles, switches and status rows are graphite (`bg-secondary` + `text-muted-foreground`, a
switch's on state is `foreground`), never blue.

**The AA Pair Rule.** Every text/background pair meets 4.5:1 in both themes: white on
`--primary`, `--primary-ink` on the page, and Alarm Red on its 10–20% tint.

**The Red Means Loss Rule.** Alarm Red is used only where something is revoked, deleted, banned
or invalid. Never for emphasis, never as a brand color.

## Typography

**Display Font:** Manrope Variable (with ui-sans-serif, system-ui)
**Label/Mono Font:** system monospace stack (ui-monospace, SFMono-Regular, Menlo)

**Character:** Manrope's geometric, slightly technical forms carry the whole interface; tight
negative tracking on large sizes makes headlines and numbers feel engineered. Mono is used only
for things a developer copies: commands, code, keys, IDs.

### Hierarchy

- **Headline** (600, 2rem/2.5rem, -0.025em): the single `h1` of every page, via `PageHeader`.
- **Metric** (600, 2.25rem/2.75rem, -0.025em): the big readings on overview cards ("2",
  "Plataforma").
- **Title** (600, 1.125rem/1.75rem): settings section and card titles (`h2`); card titles may use 500.
- **Body** (400, 1rem/1.5rem): almost all UI text; descriptions in Gauge Gray, capped at
  42rem (`max-w-2xl`) and `text-pretty`.
- **Label** (500, 0.875rem, 0.025em, uppercase): readout captions in the Readout Strip only.
  Overview metric labels ("Contas", "Ativas") and sidebar group labels stay in sentence case.
- **Code** (400, 0.875rem, mono): commands, snippets, keys.

The scale lives in `global.css` as Tailwind's own `--text-*` tokens, larger than the defaults
for legibility (`text-xs` 14px, `text-sm` 16px, `text-base` 18px, `text-2xl` 32px, `text-3xl` 36px),
so components keep using `text-sm`/`text-xs` and grow together. Never hard-code pixel sizes.

### Named Rules

**The Readout Rule.** Uppercase is reserved for tiny instrument captions above a value. Headlines,
buttons and navigation stay in sentence case.

## Layout

- **Shell:** inside a project, the whole window takes the sidebar color; the 288px sidebar sits
  on it, and the page is an inset panel (page background, 20px from the top, a 28px rounded
  top-left corner, a 10% foreground hairline on its top and left edges) that scrolls on its
  own. Outside a project the same frame holds a shorter sidebar (Projetos, Minha conta). Below
  `md` the sidebar moves into a sheet opened from a sticky 56px top bar (translucent, backdrop
  blur), with identical content; from `md` there is no top bar, since the page's `h1` names it.
- **Page column:** centered, max 72rem (`max-w-6xl`); side padding 16px, 24px from `sm`, 40px from
  `lg`; 24–32px top, 64px bottom.
- **Page rhythm:** `PageHeader` (title, optional description, actions right-aligned from `sm`,
  stacked below on phones), then content in cards, grids of cards, or stacked settings sections.
- **Spacing:** a 4px base. 16px inside cards, 20px inside settings sections, 2px between nav
  items, 24px between sidebar groups.
- **Grids:** overview cards use 1 column on phones, 2–3 on wider screens; tables scroll
  horizontally inside their container rather than breaking the page.
- **Tables:** the header row sits on a faint muted tint (`TableHeader`) with 16px Gauge Gray
  labels, led by an 18px icon where the data is not self-evident (API keys, projects), so it frames the columns without competing with the data. Rows are
  separated by hairlines only (no vertical lines, no zebra stripes) and hover with a muted fill.
  Identities (emails) never truncate away: they wrap, and secondary columns fold under them below `lg`.

## Elevation & Depth

Flat by default. Depth is tonal: floor → sidebar → panel → raised, each a few lightness points
apart, separated by 10% white hairlines in dark (solid light gray in light). Cards use a 10%
foreground ring instead of a border. Shadows exist only on floating layers: menus and popovers
(`shadow-md`/`shadow-lg`), dialogs and sheets (`shadow-xl`, with a black-tinted overlay).

### Named Rules

**The Grounded Rule.** Anything that sits on the page is flat. A shadow means "this floats above
the page and will go away" (menu, dialog, sheet), never "this is important".

## Shapes

Gently rounded and consistent. Controls (buttons, inputs) use 8px (`rounded-lg`); cards, settings
sections and empty states use about 11px (`rounded-xl`); nav items use about 6px;
badges and the avatar are pills/circles. Empty states use a dashed hairline border; everything
else is solid. The logo always sits on its own dark rounded tile.

## Components

### Buttons

Tactile and confident: they press, they ring, they never decorate.

- **Shape:** gently rounded (8px), 40px tall by default (36px `sm`, 44px `lg`), 14px side padding,
  16px medium text (15px on `sm`), 20px icons with 8px gap.
- **Primary:** Signal Blue fill, white text; hover drops to 80% opacity.
- **Outline / Secondary:** graphite control fill (input-tinted in dark) with hairline border;
  hover lifts the fill one step.
- **Ghost:** no fill until hover (Graphite Hover).
- **Destructive:** Alarm Red text on a 10–20% red tint, never a solid red block, in the
  confirmation dialog too. Destructive actions always go through `ConfirmButton`/`ConfirmDialog`,
  whose title names the exact target ("Revogar a publishable key …fa82?") and whose description
  says what breaks. Irreversible deletions (a whole project) pass `confirmationText`: the user
  types the slug before the button enables.
- **States:** press scales to 0.97 over 120ms (only without reduced motion); focus shows a 3px
  50% blue ring plus the global 2px outline; disabled is 50% opacity with `not-allowed`; busy
  uses `cursor: progress`.

### Chips / Badges

One component (`Badge`, `badgeVariants`) for every pill, including the confirmation preview
and the sidebar count. The variant is the meaning, never decoration:

- **neutral** (8% foreground tint): what something is: a role, a key type, "Esta sessão",
  "Padrão", "MFA", a count. Roles use `RoleBadge`: both neutral, the owner with the crown that
  "Tornar dono" uses.
- **success** (emerald), **warning** (amber), **destructive** (Alarm Red): a state that is
  fine, needs attention, or blocks.
- **muted** (hairline outline, Gauge Gray text): a state that is off: revoked, disabled.

Shape: full pill, 24px tall, 10px side padding, 14px medium text, optional 16px leading icon.
Blue is never a pill color: it stays for actions.

### Cards / Containers

- **Corner Style:** about 11px.
- **Background:** Graphite Panel.
- **Shadow Strategy:** none; 10% foreground ring (cards) or hairline border (settings sections).
- **Internal Padding:** 16px (cards, 12px when `sm`), 20px (settings sections).
- **Settings section:** title, Gauge Gray description, fields, then a footer bar (30% muted fill,
  top hairline) holding Save on the right. The `danger` tone tints the border red.
- **Overview cards:** a muted 20px icon beside the title (no tile), a sentence-case label, a
  metric, a description, then links at the bottom separated by a hairline. While loading, the
  metric is one placeholder and the description is hidden, never "Carregando…" next to it.
- **No nested boxes:** a form or row inside a card or settings section is separated by a top
  hairline (`border-t pt-4`), never wrapped in its own bordered box.

### Inputs / Fields

- **Style:** 40px, 8px radius, 12% white stroke, transparent fill (30% input tint in dark),
  placeholder in Gauge Gray.
- **Focus:** border turns Focus Blue plus a 3px 50% blue ring.
- **Error / Disabled:** red border with a 20–40% red ring; disabled at 50% opacity.
- Fields always come wrapped in `FormField` (label, control, hint/error).

### Navigation

- **Sidebar (inside a project, 288px):** a column of four parts.
  - **Header:** the project switcher. A 44px graphite tile with the project's initial and a
    12px API status dot (emerald / red / gray, ringed in the sidebar color; its words are
    screen-reader only), the project name (18px semibold), the slug in mono below, and an
    up-down icon. The menu lists projects, "Todos os projetos" and "Novo projeto".
  - **Daily pages:** Visão geral, Chaves de API, Usuários, Login social, Email. 44px rows, 8px
    radius, 20px icons. Hover and current fill with Graphite Hover; the current item is
    semibold with a Signal Ink icon in Solar's Bold variant. Usuários carries a live count
    pill (neutral tint, tabular numbers, hidden at zero).
  - **Divider**, then "Todos os projetos".
  - **Foot:** the MFA reminder card while the console account has MFA off ("Recomendado"
    amber pill, a dismiss button remembered per browser, "Ativar MFA" outline button), then
    Configurações, a divider, and the account block: a 44px Signal Blue avatar with initials,
    the email's name in semibold over the full email, and an up-down icon. Its menu opens
    upward at the block's width: Minha conta, theme, Sair.
- **Top bar (phones only):** the menu button and the current page's name.
- **Tab title:** every page names the browser tab "Página · Projeto · NelcotaCloud", so tabs
  tell apart and screen readers announce where a navigation landed.
- **Mobile:** the menu button opens a sheet with the same sidebar content.

### Empty State

Dashed container, centered: a semibold title led by a small muted line icon on the same line (no
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

- **Size:** 672px wide (`sm:max-w-2xl`), 24px padding, 20px gaps, a 20px semibold title; the
  footer bar spans the full width on a 50% muted fill. Taller than the screen, the dialog scrolls
  inside. The profile photo editor is the one wider dialog (768px), for the crop area.
- **Confirmations show the change:** a hairline row with the target's icon and name, then its
  current state struck out, an arrow and the new state (Alarm Red tint when destructive, Signal
  Ink on a blue tint otherwise), played once on open (`animate-change-*`). The resting styles are
  the final frame, so reduced motion shows the result directly. Screen readers hear "Ativa passa
  a Revogada". An action that changes two people (handing a project over) shows both rows,
  yours included, and confirms with a neutral (secondary) button instead of the routine blue.

### Feedback

- **Success:** `showFlash` puts one sentence in the green notice above the page (`FlashNotice`,
  a polite live region, sticky under the top bar so it is seen from far down the page) for six
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
columns by hairlines; each column has an uppercase readout label with a 14px icon, the value in
mono, and one muted sentence of context. Use it for facts about the project, never for marketing
claims.

### Code Block

`CodeBlock` (mono 14px on a graphite fill, hairline border, 8px radius) inside numbered steps
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
- **Do** keep Signal Blue to the primary action, the current nav icon and focus (The One Signal
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

- **Don't** add a second accent color or use blue for decoration, gradients or large fills.
- **Don't** use solid red buttons; destructive actions are red text on a red tint, behind a
  confirmation.
- **Don't** use `text-primary` for text or icons; use `text-primary-ink`.
- **Don't** import `lucide-react` (shadcn's default): swap any icon a new shadcn component brings
  for its Solar Linear equivalent.
- **Don't** put shadows on cards or anything that sits on the page.
- **Don't** uppercase headlines, buttons or navigation; uppercase is only for readout captions.
- **Don't** redraw, recolor or place the logo directly on a light surface.
