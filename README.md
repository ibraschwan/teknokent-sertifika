# ODTÜ Teknokent Sertifika Platformu

Certificate generation and distribution platform for ODTÜ Teknokent.
Generates custom-designed PDF certificates, delivers them via email, and provides
shareable weblinks with social media previews.

Based on [certiffy-eu/certiffy-web](https://github.com/certiffy-eu/certiffy-web).

## Stack

React 19 + React Router 7 + TypeScript + Tailwind CSS v4 + Prisma + PostgreSQL.
PDF generation via `pdf-lib`, email via Resend.

## Local development

```bash
cp .env.template .env            # fill in secrets
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev                      # http://localhost:5173
```

## Required environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `DOMAIN_ROOT` | Public URL with scheme, no trailing slash (e.g. `https://sertifika.metustars.com`) |
| `SESSION_SECRET` | Random 32+ byte hex for cookie signing |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `SEED_ADMIN_EMAIL` | Root admin email seeded on first boot |
| `SEED_ADMIN_PASSWORD` | Root admin password seeded on first boot |
| `SEED_ADMIN_FIRSTNAME` / `SEED_ADMIN_LASTNAME` | Root admin display name |

Optional: `GOOGLE_LOGIN_CLIENT_ID` + `GOOGLE_LOGIN_CLIENT_SECRET` (OAuth),
`BACKGROUND_REMOVAL_URL` (user-photo background removal service).

## Deployment

Deployed via Coolify at https://coolify.metustars.com to
https://sertifika.metustars.com. Coolify builds from this repo's `Dockerfile`
on push to `main`.
