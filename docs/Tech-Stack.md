# Tech Stack & Hosting

> Assumptions to confirm:
> - Video transcoding/streaming via Mux. Alternative: Cloudflare Stream. Please confirm preference.
> - Optional search via Algolia for better discovery.

## Frontend
- Next.js (pages-based) with TypeScript and React.
- Styling: Tailwind CSS.
- Forms: React Hook Form + Zod.
- State: minimal local state + SWR or React Query.

## Backend & Services
- Firebase Authentication (email/password, Google, Apple) with MFA optional.
- Firestore (Native mode) for data.
- Cloud Storage for uploads and assets.
- Cloud Functions (Node 20) for webhooks, scheduled tasks, and video pipeline.
- Transcoding/Playback: Mux (webhooks, signed playback), or Cloudflare Stream.
- Search/Index: Firestore composite indexes; optional Algolia.

## DevOps & Hosting
- Vercel for frontend hosting and CI/CD.
- Firebase projects per environment (local via Emulators, staging, prod).
- Environment secrets via Vercel and Firebase runtime config.

## Analytics & Monitoring
- Vercel Analytics, Firebase Analytics.
- Optional: Sentry for error monitoring, PostHog for product analytics.

## Payments (Phase 2)
- Stripe for invoices/cards; bank/wire via manual marking or Stripe Financial Connections.

## Tooling
- TypeScript, ESLint, Prettier.
- Jest/Playwright for tests (as needed).
