# Folio — Client Marketing Pitch and Cost Assessment

## Executive Summary
Folio is a modern portfolio and professional networking platform purpose-built for cinematographers, filmmakers, and production companies. It merges high-quality video hosting with industry-native workflows (credits, call sheets, IMDb enrichment) and light CRM to reduce cost and complexity versus stitching together Vimeo + Squarespace + spreadsheets. Hosted on Firebase and deployed on Vercel, Folio is fast, secure, and scalable.

## Value Proposition (Why Now, Why Us)
- Consolidate tools: Replace Vimeo hosting + website builder + manual credit tracking with one unified platform.
- Industry-native UX: Treat videos as professional credentials with credits, roles, and verified history.
- Lower TCO: Reduce recurring software and hosting spend while improving reliability and support.
- Trust and access: Direct feedback loop with leadership; roadmap shaped by real film-industry needs.

## Who It’s For
- Cinematographers, editors, directors, and producers who need a professional reel and credit history.
- Production companies who need to discover talent, review work, and staff projects quickly.

## Core Benefits (Client-Friendly)
- Professional portfolios that look great on any device and embed anywhere.
- Credit automation (call sheets + IMDb data) that keeps profiles current with minimal effort.
- Search and discovery tuned for film: by role, camera, location, collaborators, and more.
- Optional workflow add-ons: contracts, invoicing, and payment tracking.

## Feature Highlights (MVP → Pro)
- MVP (6–8 weeks):
  - Auth + profile pages, video upload → transcode → playback, public portfolio, basic search.
- Pro (additional 8–12 weeks):
  - Credit import (call sheets, IMDb enrichment), company accounts/projects, analytics.
- Workflow (12+ weeks after Pro):
  - Contracts, invoicing, payment integrations, advanced recommendations.

## Competitive Advantages
- Built for film, not generic creators: credit model, collaborators, and gear metadata.
- Better UX than Vimeo/YouTube for professional presentation and discovery.
- Direct support and fast iteration based on user feedback.

## Implementation Plan and Timeline
- Phase 0 – Validation (2–3 weeks): landing page, demo, interviews.
- Phase 1 – MVP (6–8 weeks): core hosting + portfolios + basic search.
- Phase 2 – Pro (8–12 weeks): credits import, company features, analytics.
- Phase 3 – Workflow (12+ weeks): contracts, invoicing, payments.

---

## Cost to Develop (Build)
All figures are estimates and depend on final scope, provider choices, and team size. Assumes 1 lead engineer + 1 full-stack engineer + part-time designer/PM.

- Phase 0 (Validation, 2–3 weeks): $8k – $18k
- Phase 1 (MVP, 6–8 weeks): $55k – $95k
- Phase 2 (Pro, 8–12 weeks): $75k – $135k
- Phase 3 (Workflow, 12+ weeks): $110k – $200k+

Notes:
- Using Mux or Cloudflare Stream for video reduces engineering time significantly vs building a custom pipeline.
- If credits integration requires a data partner beyond public datasets, budget for licensing or partner fees.

## Cost to Maintain (Ongoing Monthly)
Ranges assume early-stage traffic (hundreds of creators, thousands of plays/month). Pricing scales with usage.

- Cloud infrastructure (Firebase + Vercel): $200 – $600
- Video streaming provider (Mux/Cloudflare Stream): $300 – $1,500
- Search (Algolia optional): $50 – $300
- Monitoring/analytics (Sentry/PostHog optional): $0 – $200
- Misc. SaaS (email, support, domain): $50 – $150
- Total Infra (est.): $600 – $2,750 per month

Team/Operations (optional, as you scale):
- Part-time engineering maintenance (bug fixes, minor features): $4k – $12k/month
- Community/support management (part-time): $2k – $5k/month

## Pricing Guidance (Go-To-Market)
- Creator plan: $10–$20/month
- Pro plan (advanced credits, more storage, analytics): $25–$49/month
- Team/company: $99–$299/month based on seats and usage

With conservative conversion, the platform can reach breakeven on infra at ~100–250 paying users depending on provider choices and usage patterns.

## Key Assumptions
- Hosting on Firebase; frontend on Vercel.
- Video: Mux or Cloudflare Stream (confirm preference).
- Search: start with Firestore indexes; add Algolia if needed.
- Payments (Phase 2+): Stripe.

## Risks and Mitigations (Client-Friendly)
- DMCA/legal exposure → Strict content policy, takedown process, and safe harbor.
- Adoption friction → Direct outreach and industry partnerships; smooth migration from Vimeo.
- Cost drift from video bandwidth → Encode budget alerts, rate limits, and smart previews.

## Call to Action
Approve Phase 0 (Validation) to lock scope, finalize provider choices, and produce detailed delivery plan with fixed estimates.
