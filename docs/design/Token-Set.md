### Design Tokens — Warm Editorial × Friendly Enterprise

These tokens define color, typography, spacing, radius, shadows, motion, and component primitives for light and dark themes. Values balance editorial warmth with enterprise clarity.

#### Usage
- CSS variables assume a data-theme attribute on the html or body element.
- Token names are stable; update values, not names, to evolve the brand.

```css
:root {
  /* Color: Light */
  --color-bg: #FAF7F2; /* cream */
  --color-surface: #FFFFFF;
  --color-text: #0F172A; /* navy */
  --color-text-muted: #475569; /* slate */
  --color-border: #E8E3DC; /* warm gray */
  --color-primary: #10B981; /* emerald */
  --color-primary-hover: #0BA97A;
  --color-secondary: #FF725E; /* coral */
  --color-secondary-hover: #FF5A43;
  --color-info: #6366F1; /* indigo */
  --color-warning: #FB923C; /* tangerine */
  --color-danger: #EF4444; /* ruby */

  /* Typography */
  --font-display: "Editorial New", "Fraunces", ui-serif, Georgia, serif;
  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
  --font-mono: "Geist Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;

  /* Type scale (px) */
  --text-h1-size: 56px; --text-h1-line: 64px; --text-h1-weight: 600;
  --text-h2-size: 40px; --text-h2-line: 48px; --text-h2-weight: 600;
  --text-h3-size: 28px; --text-h3-line: 36px; --text-h3-weight: 600;
  --text-body-size: 16px; --text-body-line: 24px; --text-body-weight: 400;
  --text-small-size: 14px; --text-small-line: 20px; --text-small-weight: 400;
  --text-caption-size: 12px; --text-caption-line: 16px; --text-caption-weight: 400;

  /* Letter spacing */
  --letter-tight: -0.01em; /* use for display */
  --letter-normal: 0;

  /* Elevation and borders */
  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 24px;

  --shadow-0: 0 0 0 rgba(0,0,0,0);
  --shadow-1: 0 1px 2px rgba(2,6,23,0.04), 0 4px 12px rgba(2,6,23,0.06);
  --shadow-2: 0 8px 24px rgba(2,6,23,0.08), 0 16px 32px rgba(2,6,23,0.08);

  /* Spacing scale (px) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* Motion */
  --ease-standard: cubic-bezier(0.2, 0.0, 0.0, 1);
  --ease-spring-soft: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-fast: 150ms;
  --duration-base: 200ms;
  --duration-slow: 260ms;

  /* Component primitives */
  --btn-height: 44px;
  --btn-radius: var(--radius-md);
  --input-height: 44px;
  --input-radius: var(--radius-sm);
}

/* Dark Theme */
:root[data-theme="dark"] {
  --color-bg: #0B0B0F; /* near-black */
  --color-surface: #111827; /* graphite */
  --color-text: #F5F5F6; /* off-white */
  --color-text-muted: #9CA3AF; /* gray */
  --color-border: #2D3340; /* charcoal */
  --color-primary: #10B981;
  --color-primary-hover: #0BA97A;
  --color-secondary: #FF8A73;
  --color-secondary-hover: #FF725E;
  --color-info: #818CF8;
  --color-warning: #FDBA74;
  --color-danger: #F87171;

  --shadow-1: 0 1px 2px rgba(0,0,0,0.35), 0 6px 18px rgba(0,0,0,0.45);
  --shadow-2: 0 12px 36px rgba(0,0,0,0.5), 0 24px 56px rgba(0,0,0,0.5);
}
```

#### Semantic tokens

```css
:root {
  --text-primary: var(--color-text);
  --text-secondary: var(--color-text-muted);
  --surface-default: var(--color-surface);
  --surface-subtle: color-mix(in srgb, var(--color-surface), var(--color-bg) 40%);
  --border-subtle: var(--color-border);
  --interactive: var(--color-primary);
  --interactive-hover: var(--color-primary-hover);
  --cta: var(--color-secondary);
  --cta-hover: var(--color-secondary-hover);
  --focus-ring: var(--color-info);
  --success: var(--color-primary);
  --warning: var(--color-warning);
  --danger: var(--color-danger);
}
```

#### Accessibility guidance
- Maintain 4.5:1 contrast for text against backgrounds.
- Focus ring is always visible on keyboard focus: 2px outside offset.
- Avoid using coral on cream for small text; reserve for chips, accents, and large UI elements.


