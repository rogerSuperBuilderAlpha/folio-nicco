# API Surface

> The app uses a hybrid model: Next.js API routes for SSR-friendly endpoints and Firebase Cloud Functions for background tasks and webhooks. Client interactions prefer Firebase SDK where appropriate.

## REST/HTTP (Next.js API Routes)

### Public
- GET /api/profiles/:handle
  - Fetch public profile and featured videos
- GET /api/videos/:id
  - Fetch public video details + playback data
- GET /api/search
  - Query profiles/videos by term and filters

### Authenticated
- POST /api/videos/initiate-upload
  - Returns signed upload URL / Storage path, metadata token
- POST /api/videos
  - Create video record after upload finalize
- PATCH /api/videos/:id
  - Update title, description, tags, visibility
- DELETE /api/videos/:id
  - Soft delete or archive

- GET /api/me
  - Authenticated profile including role claims
- PATCH /api/me
  - Update profile fields

- POST /api/credits/import
  - Import credits from call sheet/IMDb parsers

### Admin/Company
- POST /api/companies
- PATCH /api/companies/:id
- POST /api/projects
- PATCH /api/projects/:id

## Cloud Functions (Background & Webhooks)
- onStorageFinalize(upload): enqueueTranscode(video)
- handleTranscoderWebhook(provider)
- reindexSearch(entityId)
- nightlyReminders()

## Events
- video.uploaded
- video.transcoding.started
- video.transcoding.complete
- video.published

## Request/Response Examples

### Initiate Upload
Request:
```http
POST /api/videos/initiate-upload
Authorization: Bearer <token>
Content-Type: application/json

{"filename":"reel.mov","sizeBytes":104857600,"contentType":"video/quicktime"}
```
Response:
```json
{"uploadUrl":"https://...","storagePath":"uploads/uid/uuid/file.mov","metadataToken":"xyz"}
```

### Create Video Record
Request:
```http
POST /api/videos
Authorization: Bearer <token>
Content-Type: application/json

{"storagePath":"uploads/uid/uuid/file.mov","title":"Spec Reel","tags":["dp","commercial"]}
```
Response:
```json
{"id":"videoId","status":"processing"}
```
