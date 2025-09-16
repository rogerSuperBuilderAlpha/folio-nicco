# Data Model (Firestore & Storage)

> Collections are subject to iteration as features mature. Field names use lowerCamelCase.

## Collections

### users
- uid: string (Auth UID)
- email: string
- createdAt: Timestamp
- updatedAt: Timestamp
- onboarded: boolean
- role: enum ["user", "companyAdmin", "admin"]
- subscriptionStatus: enum ["inactive", "active", "canceled", "past_due"] (default: "inactive")
- subscriptionId: string (Stripe subscription ID)
- customerId: string (Stripe customer ID)

### profiles (docId = uid)
- displayName: string
- headline: string
- bio: string
- location: string
- avatarUrl: string
- website: string
- skills: string[]
- links: { label: string; url: string }[]
- visibility: enum ["public", "private", "unlisted"]

### companies
- name: string
- description: string
- website: string
- ownerUid: string
- members: { uid: string; role: "owner" | "admin" | "member" }[]

### videos
- ownerUid: string
- title: string
- description: string
- tags: string[]
- collaborators: { uid: string; role: string }[]
- techMeta: { camera?: string; lenses?: string; location?: string; durationSec?: number }
- storage: { path: string; sizeBytes: number; sha256?: string }
- playback: { provider: "mux" | "cf" | "native"; id: string; posterUrl?: string; mp4Url?: string }
- visibility: "public" | "private" | "unlisted"
- createdAt: Timestamp
- updatedAt: Timestamp

### credits
- subjectUid: string
- videoId: string
- role: string ("DP", "1st AC", etc.)
- source: "manual" | "callSheet" | "imdb"
- verified: boolean

### projects
- name: string
- companyId?: string
- status: "active" | "archived"
- participants: { uid: string; role: string }[]
- attachments: { name: string; path: string }[]

### invoices (Phase 2)
- issuerUid: string
- recipient: { type: "person" | "company"; id?: string; name: string; email: string }
- lineItems: { desc: string; qty: number; unitAmount: number }[]
- totals: { subtotal: number; tax?: number; total: number; currency: string }
- status: "draft" | "sent" | "paid" | "overdue"
- paymentRefs?: { stripeInvoiceId?: string; external?: string }

### contracts (Phase 2)
- parties: { name: string; email: string; uid?: string }[]
- templateId: string
- status: "draft" | "sent" | "signed" | "void"
- filePath: string

### notifications
- uid: string
- type: string
- payload: any
- read: boolean
- createdAt: Timestamp

### integrationTokens
- uid: string
- provider: "imdb" | "google" | "dropbox" | "drive"
- tokenRef: string (path to secret or hashed value)

## Storage Layout
- uploads/{uid}/{uuid}/{originalFilename}
- thumbnails/{videoId}/{size}.jpg
- exports/invoices/{invoiceId}.pdf
- contracts/{contractId}.pdf

## Example: videos document
```json
{
  "ownerUid": "abc123",
  "title": "Spec Reel 2025",
  "tags": ["cinematography", "commercial"],
  "collaborators": [{ "uid": "u2", "role": "Director" }],
  "techMeta": { "camera": "Ari Alexa Mini", "durationSec": 120 },
  "storage": { "path": "uploads/abc123/xyz/file.mov", "sizeBytes": 104857600 },
  "playback": { "provider": "mux", "id": "mux-playback-id" },
  "visibility": "public",
  "createdAt": "2025-09-12T00:00:00Z"
}
```
