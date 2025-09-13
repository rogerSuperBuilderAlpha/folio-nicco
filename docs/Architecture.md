# Architecture Overview

> Assumption: Backend services use Firebase (Auth, Firestore, Storage, Functions). Web app is Next.js deployed on Vercel. This aligns with the project preferences.

## High-Level Diagram

```
[Client (Web - Next.js/Vercel)]
        |            \
        |             \-- (SSR/ISR) Next.js pages
        |                      |
        v                      v
[Firebase Auth] <----> [Firestore] <----> [Cloud Functions]
        |                       |                 \
        v                       v                  \-- Webhooks (e.g., Mux/CF Stream)
 [Storage (Uploads)]     [Algolia/Indexes]*            \
        |                                            [IMDb/Integrations]
        v
[Transcoding Provider]* (e.g., Mux or Cloudflare Stream) -> Playback
```

\* Optional/Phase-gated components.

## Frontend
- Next.js (pages-based routing) with TypeScript.
- Server-side rendering for public profile/portfolio pages; static generation with revalidation for performance.
- Client SDKs connect directly to Firebase for Auth and Firestore reads/writes.

## Backend
- Firebase Authentication: email/password, OAuth providers (Google, Apple), MFA optional.
- Firestore: core data store for users, profiles, videos, credits, projects, invoices, etc.
- Cloud Storage: original uploads, thumbnails, assets.
- Cloud Functions:
  - Video pipeline orchestration (upload finalize -> enqueue transcode -> persist playback IDs).
  - Webhooks (transcoding provider events, payment provider events if added).
  - Scheduled jobs (search indexing, cleanup, reminders).

## Search
- Start with Firestore composite indexes.
- Optionally add Algolia for full-text, faceted search on profiles, videos, and credits.

## Environments
- Local: Firebase Emulator Suite, env-based toggles.
- Staging: separate Firebase project and Vercel env.
- Production: production Firebase project and Vercel env.

## Networking & Security
- Public content via Next.js routes and CDN.
- Private data guarded by Firestore Security Rules and role-based claims.
- Signed upload URLs / Firebase Storage security enforced by Auth.

## Observability
- Vercel Analytics + Firebase Analytics for events.
- Logs and traces via Firebase/Cloud Functions logs; optional Sentry for errors.
