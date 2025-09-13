### Brand Guidelines — Warm Editorial × Friendly Enterprise

This guide defines brand principles, voice, visual identity, and implementation rules for consistency across product, web, and marketing.

#### Brand principles
- **Human**: approachable, empathetic, helpful.
- **Trustworthy**: clear, reliable, secure.
- **Premium tool**: refined, purposeful, never flashy for its own sake.

#### Voice and tone
- **Voice**: warm and direct. Avoid hype; focus on outcomes.
- **Tone adjustments**:
  - Onboarding and marketing: encouraging, inspiring.
  - Product UI: concise, neutral-positive.
  - Error states: calm, constructive, solution-oriented.

Examples:
- Headline: “Your videos, beautifully presented.”
- Body: “Upload once. Share anywhere. Track what matters.”
- Error: “We couldn’t save your changes. Try again or contact support.”

#### Color
Primary palette and roles align with `docs/design/Token-Set.md`.

- Background (light): Cream `#FAF7F2`
- Surface: White `#FFFFFF`
- Text: Navy `#0F172A`
- Muted text: Slate `#475569`
- Border: Warm gray `#E8E3DC`
- Primary: Emerald `#10B981`
- Secondary: Coral `#FF725E`
- Info: Indigo `#6366F1`
- Supporting: Warning `#FB923C`, Danger `#EF4444`

Usage rules:
- Use emerald for primary CTAs and success states.
- Use coral to accent editorial moments (badges, highlights), not for system errors.
- Maintain sufficient contrast; avoid coral text on cream for long copy.

Dark theme equivalents are defined in tokens; keep parity for state mapping.

#### Typography
- Display: Editorial New (Fraunces as free alternative) for H1–H2 only.
- UI: Inter for H3–body–small.
- Mono: Geist Mono (IBM Plex Mono alt) for code, keys, and data.

Scale (px): H1 56/64, H2 40/48, H3 28/36, Body 16/24, Small 14/20, Caption 12/16.

Rules:
- Limit display fonts to headlines to retain enterprise clarity.
- Use negative letter-spacing `-0.01em` for H1–H2 in marketing contexts only.

#### Imagery and graphics
- Photography: natural light, warm tones, diverse, candid.
- Illustration: soft lines, minimal grain (≤ 3%), duotone accents (emerald/coral).
- Do not combine heavy glows with grain; keep effects subtle.

#### Iconography
- 2px rounded strokes, consistent corner radii.
- Use filled variants only at small sizes where clarity requires it.
- Keep icon color to text colors; use coral/emerald sparingly for semantic or highlight states.

#### Motion
- Durations: 150–220ms; modals 240–280ms.
- Curves: standard ease for navigation; soft spring for micro-interactions (overshoot ≤ 1.05).
- Avoid distracting animation on data-dense views.

#### Layout, grids, and spacing
- Base spacing scale: 4, 8, 12, 16, 24, 32, 48, 64.
- Container widths: 640, 768, 1024, 1280, 1440.
- Use 24–32px padding on cards; 16px on dense tables.

#### Components overview
- Buttons: one primary per view. Secondary for alternative flows. Ghost for low emphasis.
- Inputs: clear labels, generous hit areas (≥ 44px height), helper text when needed.
- Cards: soft borders and subtle shadows; avoid nested cards.
- Tables: sticky headers, zebra rows, clear sorting affordances.

#### Accessibility
- Color contrast: text ≥ 4.5:1 (normal), ≥ 3:1 (large text ≥ 18px).
- Focus: always visible rings, 2px thickness with outer offset.
- Keyboard: all interactive elements must be reachable and operable.
- Motion sensitivity: provide a `prefers-reduced-motion` path with instant transitions.

```css
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

#### Logo and marks
- Wordmark spacing: preserve clear space equal to cap height around the mark.
- Minimum sizes: digital 24px height; avoid rasterizing below that.
- Do not distort, recolor beyond palette, or apply drop shadows.

#### Content patterns
- Headline + one-liner + CTA pair.
- Use bullets for scannability; avoid long paragraphs in product UI.

#### Governance
- Tokens are the single source of truth; proposals to change values should reference contrast checks and usage examples.
- New components must specify token usage and accessibility notes before build.


