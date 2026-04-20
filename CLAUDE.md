# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ODTÜ Teknokent's certificate platform — a React Router 7 (full-stack) app that generates custom-designed PDF certificates, delivers them via email (Resend), and provides shareable weblinks with social media previews. Forked from `certiffy-eu/certiffy-web` and rebranded for ODTÜ Teknokent. Deployed at https://sertifika.metustars.com via Coolify.

## Commands

```bash
npm run dev          # Start dev server (Vite-based, hot reload)
npm run build        # Production build (react-router build)
npm start            # Production server (react-router-serve)
npm run typecheck    # Generate route types + tsc
npm run lint         # ESLint with cache
npx prisma migrate dev      # Run database migrations (dev)
npx prisma migrate deploy   # Run database migrations (prod)
npx prisma db seed          # Seed initial admin user
npx prisma generate         # Regenerate Prisma client + Zod schemas
```

Pre-commit hooks run ESLint and `tsc --noEmit` via Husky + lint-staged.

## Architecture

**Stack:** React 19 + React Router 7 + TypeScript + Tailwind CSS v4 + Shadcn UI + Prisma + PostgreSQL

**Path alias:** `~/*` maps to `./app/*`

### Route Structure (file-based routing)

Routes live in `app/routes/` with ~80 route files. Key route groups:
- `_index` — Landing page
- `user._auth.*` — Authentication (sign in/up, forgot password, verification)
- `auth.google*` — Google OAuth flow
- `org.program.$programId.*` — Program management (CRUD, templates, batches)
- `org.program.$programId.batch.$batchId.certificates.*` — Certificate management
- `org.program.$programId.templates.*` — Template layout/QR code editors
- `org.program.$programId.social.*` — Social preview customization
- `org.user.*` — User/team management
- `cert.$certUuid.*` — Public certificate endpoints (download PDF, preview PNG, social preview, notify)
- `view.$certUuid` — Public certificate viewer

### Server Library (`app/lib/`)

All server-side business logic lives here. Key modules:
- `pdf.server.ts` — PDF generation engine (pdf-lib + fontkit + sharp + qrcode)
- `auth.server.ts` — Session-based auth, registration, login, role checks
- `auth.google.server.ts` — Google OAuth2 strategy
- `social.server.ts` — Social preview image composition (sharp)
- `user.server.ts` — User CRUD, email communications, photo management
- `organisation.server.ts` — Organisation settings (singleton, cached)
- `program.server.ts` — Program CRUD with role-based access
- `email.server.ts` — Resend email wrapper
- `prisma.server.ts` — Database client singleton
- `template.server.ts` / `typeface.server.ts` — Template and font management
- `schemas.ts` — Zod validation schemas for forms
- `text-variables.ts` — Template variable substitution (firstName, lastName, teamName)

### Auth Pattern

Cookie-based sessions (30-day). Three role levels:
- **SuperAdmin** — Global access
- **Admin** — Per-program access (`requireAdminWithProgram()`)
- **User** — View own certificates

Google OAuth auto-creates verified users; stores `oauth:google` as password sentinel.

### Auto-Generated Code (`app/generated/`)

- `prisma/` — Prisma client (generated from schema)
- `zod/` — Zod validation schemas (generated from Prisma schema)

Run `npx prisma generate` after schema changes. Do not edit generated files.

### Database Models (Prisma)

Core entities: `User`, `Organisation` (singleton), `Program`, `Batch`, `Certificate`, `Template`, `Typeface`, `SocialPreview`. Programs have admins (User[]), batches contain certificates, certificates reference templates.

Certificate has unique constraint on `(batchId, email)`. Template stores layout as `Json[]` (TextBlock array) and QR config as `Json`.

### File Storage

```
storage/
├── fonts/        # Custom typefaces for PDF generation
├── logos/        # Organisation/program logos (UUID-named)
├── user/photos/  # User profile photos (transparent PNGs)
└── social/       # Social preview backgrounds & composites
```

### Components (`app/components/`)

- `ui/` — ~30 Shadcn UI components (Radix-based)
- `template-layout-editor.tsx` — Visual template layout editor
- `template-qrcode-editor.tsx` — QR code settings editor
- `csv-drop-zone.tsx` — CSV import for bulk certificate creation
- `sidebar-admin.tsx` / `sidebar-participant.tsx` — Navigation sidebars

### Form Handling

Forms use Conform + Zod. Schemas defined in `app/lib/schemas.ts` and auto-generated in `app/generated/zod/`.

## Environment

Required env vars (see `.env.template`): `DATABASE_URL`, `DOMAIN_ROOT`, `SESSION_SECRET`, `RESEND_API_KEY`. Optional: `GOOGLE_LOGIN_*` (OAuth), `BACKGROUND_REMOVAL_URL`.

## Deployment

Dockerized (Node 24 Alpine, multi-stage build). Deployed to Coolify at https://coolify.metustars.com, which auto-builds from this repo's `Dockerfile` on push to `main`. Prisma migrations run on deployment. Public URL: https://sertifika.metustars.com.
