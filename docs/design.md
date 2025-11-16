# Design tokens and utilities

A modern, vibrant design system with gradient accents. Light is clean and bright; dark is deep with rich contrast.

## Tokens (CSS variables)

- Colors
  - --background, --surface-1, --surface-2, --surface-muted
  - --border, --foreground, --muted-foreground, --muted-foreground-strong
  - --primary (indigo #6366f1), --primary-hover (purple #7c3aed), --primary-active, --primary-contrast, --primary-light
  - --secondary (hot pink #ec4899), --secondary-hover
  - --success, --warning, --danger
- Shadows
  - --shadow-sm, --shadow-md, --shadow-lg, --shadow-glow
- Radius
  - --radius-sm (12px), --radius-md (16px), --radius-lg (24px)

Switch palettes by toggling `html.theme-light` or `html.theme-dark` (done by ThemeProvider).

## Utilities

- .card: Elevated surface with subtle border, hover lift (-4px), and gradient border on hover
- .btn, .btn-primary, .btn-outline: Modern buttons with gradient backgrounds and glow effects
- .input: Base input styling with focus states
- .badge: Subtle tag/badge
- .pill-outline: Uppercase small pill (for toggles/actions)
- .progress > span: Gradient progress bar

## Button Variants

- **btn-primary**: Gradient purple button with glow shadow
- **btn-outline**: Transparent with border, fills on hover
- **btn-ghost**: No border, subtle background on hover
- **btn-danger**: Red gradient for destructive actions
- **btn-link**: Text-only link style

## Usage examples

- Primary button: `<button class="btn btn-primary">Create</button>`
- Outline button: `<button class="btn btn-outline">Cancel</button>`
- Card: `<div class="card p-6 rounded-2xl">...</div>`
- Input: `<input class="input w-full" />`
- Progress: `<div class="progress"><span style="width:42%" /></div>`
- Gradient text: `<span class="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">Text</span>`

## Design Principles

- **Vibrant & Modern**: Purple-pink gradient palette for energy and engagement
- **Depth & Dimension**: Strategic use of shadows, glows, and gradients
- **Smooth Interactions**: Scale and translate animations on hover
- **Clear Hierarchy**: Extrabold headings with gradient effects for impact
- **Accessibility**: High contrast ratios maintained in both themes
