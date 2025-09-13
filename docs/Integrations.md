# Integrations

## IMDb
- Approach: Screen-scrape is disallowed; use IMDb datasets (bulk) or 3rd-party APIs (e.g., OMDb for titles; not for credits). Explore IMDbPro partner program for verified credits.
- Verification: Match person names + titles + roles; allow user confirmation
- Sync: Nightly enrichment job; manual refresh button

## Call Sheet Parsing
- Upload PDF/CSV call sheets
- Parse with Cloud Function using a template-based extractor; ML/OCR (Tesseract) as fallback
- Map to credits: subjectUid, role, project, date

## Social/Links (Phase 2)
- Google Drive/Dropbox import for assets
- Calendar (Google) for reminders

## Search Indexing
- Use Algolia for profiles/videos/credits with facets: role, camera, location, collaborators
