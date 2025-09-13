# Security, Privacy, and DMCA

## Security
- Firebase Auth with strong password policy and optional MFA
- Firestore Rules with least-privilege access
- Secrets management via Vercel/Firebase config
- Signed URLs for uploads and private playback
- Regular dependency scanning; CI checks

## Privacy
- GDPR/CCPA readiness: data export/delete on request
- Privacy policy documenting data usage (analytics, logs)
- Minimize PII; store only necessary fields

## DMCA & Copyright
- Clear Terms of Service prohibiting unauthorized uploads
- DMCA takedown process and counter-notice workflow
- Safe harbor: quick response to notices, repeat infringer policy
- Watermarking optional; hash-based duplicate detection (Phase 2)

## Content Moderation
- Abuse reporting endpoint
- Admin review tools; audit logs
