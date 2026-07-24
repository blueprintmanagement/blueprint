# Blueprint

Blueprint is a private B2B SaaS prototype for construction financial management.

The current application is a Next.js front-end MVP focused on:

- selecting and managing active construction projects;
- registering expenses by project and phase;
- keeping supplier and catalog data for faster entry;
- tracking payment, accounting delivery, and receipt/document pending items;
- exporting a monthly XLSX dossier for accountants and investors.

## Project Status

This repository is used for private versioning and backup. It is not an open-source project.

The MVP now uses Supabase Auth, organization-scoped data, private attachment storage, and RLS-backed tables. A localStorage fallback remains only for development when Supabase environment variables are not configured.

## Supabase Foundation

1. Open the Supabase SQL Editor for the project.
2. Execute `supabase/schema.sql`.
3. Copy `.env.example` to `.env.local`.
4. Fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SECRET_KEY`

The schema is multi-tenant by default: all business tables are scoped by `organization_id`, Row Level Security is enabled, and file storage is private through the `blueprint-attachments` bucket.

Authentication and organization creation are active. Organization creation is handled by a server-side route that validates the logged-in user's Supabase token before using the server-only key.

The local `/api/dev-signup` route exists only to bypass Supabase's default email rate limit during local development. It is disabled in production and restricted to localhost.

## Development

```bash
npm install
npm run dev
```

Open the local Next.js URL shown in the terminal.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm audit --audit-level=moderate
```
