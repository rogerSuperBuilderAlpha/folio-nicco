# Video Pipeline

> Assumption: Use Mux as primary transcoding/streaming provider. Swappable with Cloudflare Stream.

## Flow
1. Client requests upload session (initiate-upload)
2. Client uploads to Firebase Storage or directly to Mux (direct upload)
3. onFinalize (if Storage path): Cloud Function creates Mux asset
4. Receive webhook: asset.ready -> store playbackId/poster
5. Publish video (visibility, metadata)

## Upload Strategies
- Direct-to-Storage: simpler local emulation, works with onFinalize trigger
- Direct-to-Mux: faster ingest for large files; uses Mux signed upload URLs

## Metadata & Posters
- Extract duration, resolution via provider
- Generate thumbnails via provider or Cloud Function using FFmpeg (if needed)

## Security
- Signed playback (Mux signed tokens) for private/unlisted videos
- Public videos use public playback ID

## Error Handling
- Retry webhook processing with idempotency keys
- Mark video status: uploaded -> processing -> ready | failed

## Example Webhook Payload (Mux)
```json
{
  "type":"video.asset.ready",
  "data": {"id":"assetId","playback_ids":[{"id":"play123","policy":"public"}]}
}
```
