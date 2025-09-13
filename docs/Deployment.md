# Deployment & Environments

## Environments
- Local: Firebase Emulators + Next.js dev
- Staging: Vercel preview + Firebase staging project
- Production: Vercel production + Firebase prod project

## Vercel
- Connect Git repo; enable preview deployments
- Set env vars for each env (`MUX_TOKEN`, `ALGOLIA_*`, etc.)
- Custom domains: `folio.app` (example) with subdomains per env

## Firebase
- Separate projects: `folio-staging`, `folio-prod`
- Deploy Functions: `firebase deploy --only functions`
- Firestore rules & indexes managed via repo configs

## CI/CD
- On push to `main`: deploy to staging
- Promote to prod via tag or GitHub Release

## Secrets
- Managed in Vercel project settings and Firebase runtime config
