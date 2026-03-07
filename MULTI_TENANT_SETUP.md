# Multi-Tenant SaaS Foundation

## Current Project Analysis

Before this change, the project worked like this:

- Frontend: one large client-side React runtime in [RadReport.runtime.jsx](/Users/huzaifagulzar/Desktop/code/RadReport.runtime.jsx)
- Auth: localStorage-only session and hardcoded seeded users on the client
- Persistence: Vercel KV buckets keyed by username in:
  - [api/drafts.js](/Users/huzaifagulzar/Desktop/code/api/drafts.js)
  - [api/patients.js](/Users/huzaifagulzar/Desktop/code/api/patients.js)
  - [api/records.js](/Users/huzaifagulzar/Desktop/code/api/records.js)
- Deployment: static pages plus Vercel serverless APIs, with no real tenant boundary

That architecture is not safe for SaaS multi-tenancy because:

- users are not tied to organizations in a database
- sessions are not server-managed
- org-level filtering does not exist in the current frontend
- data isolation depends on client behavior instead of backend enforcement

## What This Foundation Adds

This step adds the backend foundation for SaaS multi-tenancy without breaking the current UI:

- PostgreSQL schema and migration system
- organizations, users, sessions, settings, patients, doctors, templates, reports, invoices tables
- tenant-aware auth APIs
- organization and user management APIs
- compatibility mode for existing patient/draft/record APIs
- demo seed data for:
  - `alnoor`
  - `citydiag`
  - plus a `platform` organization for the super admin account
- subdomain-ready tenant resolution helper for future hosts like `alnoor.radreportpro.online`

Important:

- The current frontend is intentionally not switched over yet.
- Multi-tenant mode stays off until you enable it.
- This avoids breaking the current working reporting UI.

## Roles

Supported backend roles:

- `super_admin`
- `organization_admin`
- `radiologist`
- `receptionist`
- `referring_doctor`

## Environment Variables

Copy [`.env.example`](/Users/huzaifagulzar/Desktop/code/.env.example) and set:

- `DATABASE_URL`
- `MULTI_TENANT_MODE=enabled` only when you are ready to use the new backend
- `SESSION_COOKIE_NAME`
- `SESSION_COOKIE_DOMAIN`
- `APP_BASE_DOMAIN`

Notes:

- Leave `MULTI_TENANT_MODE=disabled` to keep the current legacy frontend behavior.
- Set `SESSION_COOKIE_DOMAIN=.radreportpro.online` later when you start using wildcard subdomains in production.

## Setup Steps

1. Install dependencies.

```bash
npm install
```

2. Run the database migration.

```bash
npm run db:migrate
```

3. Seed demo data.

```bash
npm run db:seed
```

4. Keep legacy mode while testing the current UI:

```bash
MULTI_TENANT_MODE=disabled
```

5. Enable tenant mode only when you start testing the new auth and org APIs:

```bash
MULTI_TENANT_MODE=enabled
```

## Demo Accounts

After seeding:

- Platform super admin:
  - username: `superadmin`
  - password: `ChangeMeNow123!`
- Al Noor org:
  - `alnoor_admin`
  - `alnoor_rad`
  - `alnoor_frontdesk`
  - `alnoor_ref`
- City Diagnostics org:
  - `city_admin`
  - `city_rad`
  - `city_frontdesk`
  - `city_ref`

All seeded demo passwords are:

```text
ChangeMeNow123!
```

Change them immediately outside demo environments.

## New APIs

Auth:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

Admin:

- `GET|POST|PATCH /api/organizations`
- `GET|POST|PATCH /api/users`
- `GET|PUT /api/settings`

Tenant-aware compatibility routes:

- `GET|PUT /api/drafts`
- `GET|PUT /api/patients`
- `GET|PUT /api/records`

Behavior:

- if `MULTI_TENANT_MODE=disabled`, the legacy KV behavior remains active
- if `MULTI_TENANT_MODE=enabled`, those routes require a server session and scope data by `organization_id`

## Database Notes

The schema is in [migrations/001_multi_tenant_schema.sql](/Users/huzaifagulzar/Desktop/code/migrations/001_multi_tenant_schema.sql).

Multi-tenancy rules enforced in the backend foundation:

- every organization has its own row and settings
- every user belongs to one organization
- patients, doctors, templates, reports, and invoices are stored with `organization_id`
- sessions store both `user_id` and `organization_id`
- organization admins are constrained to their own organization in the new APIs

## Future Subdomain Readiness

Tenant slug and subdomain support is prepared in:

- [lib/tenant.js](/Users/huzaifagulzar/Desktop/code/lib/tenant.js)

Planned production pattern:

- `alnoor.radreportpro.online`
- `citydiag.radreportpro.online`

The login endpoint can already resolve an organization from an explicit slug or the request host when `APP_BASE_DOMAIN` is configured.

## Safe Next Steps

This foundation is not the final frontend migration. The next safe steps are:

1. Replace localStorage login in [RadReport.runtime.jsx](/Users/huzaifagulzar/Desktop/code/RadReport.runtime.jsx) with `/api/auth/login` and `/api/auth/me`.
2. Add a super-admin UI for organizations and org admins.
3. Add an organization settings page in the frontend.
4. Replace client-side role checks with backend session data.
5. Remove legacy username-keyed KV fallback once the new flow is stable.
6. Move share portal data to the tenant database so share links also become organization-scoped.

## Rollout Recommendation

Do not switch the live production frontend to multi-tenant mode in one jump.

Recommended rollout:

1. deploy this foundation
2. verify migrations and seed locally or on staging
3. build the new login and org admin frontend
4. test org separation with seeded `alnoor` and `citydiag`
5. only then enable `MULTI_TENANT_MODE=enabled` on production
