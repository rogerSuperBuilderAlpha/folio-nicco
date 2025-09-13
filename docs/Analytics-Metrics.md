# Analytics and Success Metrics

## Product Metrics
- Adoption: DAU/MAU, signups, activated profiles (uploaded 1+ video)
- Engagement: monthly edits to profile/portfolio, video plays
- Retention: cohort retention at 1/4/12 months
- Workflow penetration: % users using invoices/contracts (Phase 2)
- NPS: quarterly survey

## Instrumentation
- Firebase Analytics for event tracking
- Custom events:
  - profile.updated, video.play, video.upload.started, video.ready, search.performed
- Vercel Analytics for web vitals and page views
- Optional: PostHog or Segment for richer funnels

## Dashboards
- Mix of Firebase Analytics + BigQuery export (optional) for custom SQL

## Data Governance
- Document event schema and versioning
- Respect privacy opt-outs; anonymize where possible
