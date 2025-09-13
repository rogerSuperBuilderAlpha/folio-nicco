### UI Kit — Core Components and States

Aligned to the Warm Editorial × Friendly Enterprise tokens in `docs/design/Token-Set.md`. Component recipes use semantic tokens and CSS variables. This kit covers anatomy, states, and usage notes.

#### Buttons

States: default, hover, active, focus, disabled, loading.

Variants:
- Primary (emerald solid)
- Secondary (coral outline / ghost)
- Tertiary (text button, indigo focus behavior)

```css
.btn { height: var(--btn-height); border-radius: var(--btn-radius); padding: 0 var(--space-5); font: 600 var(--text-body-size)/var(--text-body-line) var(--font-sans); display: inline-flex; align-items: center; gap: var(--space-2); border: 1px solid transparent; transition: background-color var(--duration-base) var(--ease-standard), color var(--duration-base) var(--ease-standard), border-color var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard); }
.btn:focus-visible { outline: none; box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring), transparent 70%), 0 0 0 5px var(--surface-default); }
.btn--primary { background: var(--interactive); color: #fff; }
.btn--primary:hover { background: var(--interactive-hover); }
.btn--secondary { background: transparent; color: var(--cta); border-color: color-mix(in srgb, var(--cta), #000 10%); }
.btn--secondary:hover { background: color-mix(in srgb, var(--cta), transparent 92%); }
.btn--ghost { background: transparent; color: var(--text-primary); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
```

Usage notes:
- Primary is used for a single, most prominent action per view.
- Secondary (coral) highlights editorial or marketing moments; avoid overuse in dense tools.

#### Badges and Chips

```css
.badge { display: inline-flex; align-items: center; gap: var(--space-1); padding: 0 var(--space-2); height: 24px; border-radius: var(--radius-sm); font: 600 var(--text-small-size)/20px var(--font-sans); border: 1px solid var(--border-subtle); background: var(--surface-subtle); color: var(--text-secondary); }
.badge--success { border-color: color-mix(in srgb, var(--success), #000 10%); color: var(--success); background: color-mix(in srgb, var(--success), transparent 90%); }
.badge--warning { border-color: color-mix(in srgb, var(--warning), #000 10%); color: var(--warning); background: color-mix(in srgb, var(--warning), transparent 90%); }
.badge--danger { border-color: color-mix(in srgb, var(--danger), #000 10%); color: var(--danger); background: color-mix(in srgb, var(--danger), transparent 90%); }
```

#### Inputs

```css
.input { height: var(--input-height); border-radius: var(--input-radius); padding: 0 var(--space-4); width: 100%; color: var(--text-primary); background: var(--surface-default); border: 1px solid var(--border-subtle); box-shadow: var(--shadow-0); transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard); }
.input::placeholder { color: color-mix(in srgb, var(--text-secondary), transparent 20%); }
.input:hover { border-color: color-mix(in srgb, var(--border-subtle), #000 10%); }
.input:focus { outline: none; border-color: var(--focus-ring); box-shadow: 0 0 0 3px color-mix(in srgb, var(--focus-ring), transparent 75%); }
.input--invalid { border-color: var(--danger); }
.help-text { color: var(--text-secondary); font: var(--text-small-weight) var(--text-small-size)/var(--text-small-line) var(--font-sans); }
```

Anatomy: label, input, description, error. Prefer floating label only where space is tight.

#### Cards

```css
.card { background: var(--surface-default); color: var(--text-primary); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); box-shadow: var(--shadow-1); padding: var(--space-6); }
.card--hero { border-radius: var(--radius-lg); padding: var(--space-7); box-shadow: var(--shadow-2); background: linear-gradient(180deg, color-mix(in srgb, var(--color-bg), #fff 10%), var(--surface-default)); }
```

Usage: Keep 24–32px padding; avoid deep nesting of cards.

#### Navigation

Topbar with logo, primary nav, utility area.

```css
.topbar { height: 64px; display: flex; align-items: center; gap: var(--space-6); padding: 0 var(--space-6); border-bottom: 1px solid var(--border-subtle); background: var(--surface-default); }
.nav-link { color: var(--text-secondary); text-decoration: none; padding: var(--space-3) var(--space-2); border-radius: var(--radius-sm); transition: color var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard); }
.nav-link:hover { color: var(--text-primary); background: color-mix(in srgb, var(--surface-subtle), transparent 50%); }
.nav-link[aria-current="page"] { color: var(--text-primary); box-shadow: inset 0 -2px 0 0 var(--interactive); }
```

#### Tables

```css
.table { width: 100%; border-collapse: separate; border-spacing: 0; background: var(--surface-default); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); overflow: hidden; }
.table thead th { text-align: left; font: 600 var(--text-small-size)/var(--text-small-line) var(--font-sans); color: var(--text-secondary); background: color-mix(in srgb, var(--surface-subtle), transparent 50%); position: sticky; top: 0; }
.table tbody td, .table thead th { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border-subtle); }
.table tbody tr:nth-child(2n) { background: color-mix(in srgb, var(--surface-subtle), transparent 70%); }
.table tbody tr:hover { background: color-mix(in srgb, var(--surface-subtle), transparent 50%); }
```

#### Empty States

Principles: warm illustration, concise outcome text, primary CTA + secondary link.

```html
<div class="card" role="region" aria-labelledby="empty-title">
  <h3 id="empty-title">No videos yet</h3>
  <p>Add your first video to get analytics and shareable pages.</p>
  <div class="actions">
    <button class="btn btn--primary">Upload video</button>
    <button class="btn btn--ghost">Watch demo</button>
  </div>
</div>
```

#### Modals & Toasts

```css
.modal-backdrop { position: fixed; inset: 0; background: rgba(2,6,23,0.55); backdrop-filter: blur(4px); }
.modal { position: fixed; inset: auto; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, calc(100vw - 32px)); background: var(--surface-default); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); box-shadow: var(--shadow-2); padding: var(--space-6); }
.toast { position: fixed; right: 16px; bottom: 16px; background: var(--surface-default); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); box-shadow: var(--shadow-2); padding: var(--space-4) var(--space-5); }
```

#### Motion

Durations: 150–220ms; 240–280ms for modals. Curves: `--ease-standard`, `--ease-spring-soft`.

```css
[data-animate="fade-in"] { animation: fade-in var(--duration-base) var(--ease-standard) both; }
@keyframes fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
```

#### Accessibility
- Always show focus for keyboard users with outside offset rings.
- Maintain contrast: text ≥ 4.5:1, large text ≥ 3:1.
- Ensure hit areas ≥ 44px for interactive elements.


