# Design tokens and utilities

A vibrant, modern design system with gradient accents and smooth animations. Optimized for educational platforms with deep purple/indigo primary colors.

## Tokens (CSS variables)

- Colors
  - --background, --surface-1, --surface-2, --surface-muted
  - --border, --foreground, --muted-foreground, --muted-foreground-strong
  - --primary, --primary-hover, --primary-active, --primary-contrast, --primary-light
  - --secondary, --secondary-hover, --secondary-light (coral/pink accent)
  - --accent, --accent-hover, --accent-light (cyan accent)
  - --success, --warning, --danger
- Gradients
  - --gradient-primary, --gradient-secondary, --gradient-accent, --gradient-dark
- Shadows
  - --shadow-sm, --shadow-md, --shadow-lg, --shadow-glow
- Radius
  - --radius-sm (12px), --radius-md (16px), --radius-lg (24px)

Switch palettes by toggling `html.theme-light` or `html.theme-dark` (done by ThemeProvider).

## Utilities

- .card: Elevated surface with gradient accent on hover and smooth lift animation
- .btn, .btn-primary, .btn-outline: Buttons with gradient backgrounds and ripple effects
- .input: Enhanced input styling with focus glow
- .badge: Gradient tag/badge
- .pill-outline: Uppercase small pill with hover effects
- .progress > span: Animated progress bar with shimmer effect

## Usage examples

- Primary button: `<button class="btn btn-primary">Create</button>`
- Outline button: `<button class="btn btn-outline">Cancel</button>`
- Card: `<div class="card p-6 rounded-[16px]">...</div>`
- Input: `<input class="input w-full" />`
- Progress: `<div class="progress"><span style="width:42%" /></div>`

Modern gradients and animations are used throughout. Legacy classes like `.gradient-border` remain for compatibility.
