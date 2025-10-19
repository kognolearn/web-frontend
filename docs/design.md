# Design tokens and utilities

A minimalist, pastel design system without gradients. Light is default; dark is deep navy.

## Tokens (CSS variables)

- Colors
  - --background, --surface-1, --surface-2, --surface-muted
  - --border, --foreground, --muted-foreground, --muted-foreground-strong
  - --primary, --primary-hover, --primary-active, --primary-contrast
  - --success, --warning, --danger
- Shadows
  - --shadow-sm, --shadow-md, --shadow-lg
- Radius
  - --radius-sm, --radius-md, --radius-lg

Switch palettes by toggling `html.theme-light` or `html.theme-dark` (done by ThemeProvider).

## Utilities

- .card: Flat surface with soft border and hover lift
- .btn, .btn-primary, .btn-outline: Buttons
- .input: Base input styling
- .badge: Subtle tag/badge
- .pill-outline: Uppercase small pill (for toggles/actions)
- .progress > span: Simple progress bar

## Usage examples

- Primary button: `<button class="btn btn-primary">Create</button>`
- Outline button: `<button class="btn btn-outline">Cancel</button>`
- Card: `<div class="card p-6 rounded-[16px]">...</div>`
- Input: `<input class="input w-full" />`
- Progress: `<div class="progress"><span style="width:42%" /></div>`

No gradients or glass effects are used; legacy classes like `.gradient-border` remain as no-ops for safety.
