# Local Development

## Prerequisites
- Node.js 20+
- pnpm or npm
- Firebase CLI
- Vercel CLI (optional)

## Setup
1. Clone repo
2. Install deps: `pnpm install`
3. Copy env: `.env.local` for Next.js; `firebase functions:config:set` for secrets
4. Start emulators: `firebase emulators:start`
5. Run app: `pnpm dev` (or `vercel dev`)

## Emulated Services
- Auth, Firestore, Storage, Functions

## Test Accounts
- Use emulator UI to create users or seed script (TBD)

## Lint/Test
- `pnpm lint`
- `pnpm test`
