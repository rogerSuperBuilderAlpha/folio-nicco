# Auth, Roles, and Permissions

## Authentication
- Providers: Email/password, Google, Apple (OIDC)
- MFA: Optional TOTP/SMS (Phase 2)
- Sessions: Firebase Auth client SDK; server verifies ID token on API routes

## Roles
- user: default
- companyAdmin: manage company and projects
- admin: platform-level administration

Role is derived from custom claims on the Firebase Auth user and mirrored in Firestore where needed.

## Permissions (high-level)
- user:
  - Read own data; read public others
  - Create/edit own videos, profile
  - Import own credits
- companyAdmin:
  - All user permissions
  - Create/edit company, projects, assign members
- admin:
  - Manage global settings; moderate content

## Firestore Rules (outline)
- profiles: read public; owner read/write; admins read/write
- videos: public read when visibility == "public"; owner read/write; admins moderate
- credits: user can create for subjectUid == auth.uid or via verified source; admins write
- companies/projects: members with roles

## Session on Server
- Verify ID token on Next.js API routes
- Enforce role-based checks per endpoint
