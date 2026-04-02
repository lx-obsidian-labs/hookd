This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database backend (free-tier friendly)

This app now supports two storage backends for profile/auth/session data:

- `file-json` (default): local `.data/kv-store.json`
- `postgres` (recommended for shared/dev/prod): set `DATABASE_URL`

If `DATABASE_URL` starts with `postgres://` or `postgresql://`, the app will use PostgreSQL automatically.

### Free-tier option

Use a free Postgres provider like Neon or Supabase free tier, then create `.env.local`:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

Health check endpoint:

```bash
GET /api/system/database
```

It reports backend + profile/auth/rate-limit store readiness.

Admin config check endpoint:

```bash
GET /api/system/config
Header: x-admin-key: <ADMIN_DASHBOARD_KEY>
```

It reports whether required production env vars are set (without exposing secret values).

Production note: file JSON storage is disabled in production. `DATABASE_URL` must be set.

### Migrating legacy local JSON data

If you already used the app before Postgres setup, you can migrate old `.data/*.json` content:

```bash
POST /api/system/database/migrate
Header: x-admin-key: <ADMIN_DASHBOARD_KEY>
```

In local dev, default admin key is `dev-admin-key` when `ADMIN_DASHBOARD_KEY` is not set.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
