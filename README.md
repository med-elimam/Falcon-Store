# Falcon Store — The Scent Vault

Arabic-first perfume storefront for Falcon Store in Nouakchott. The project includes a cinematic home page, filterable catalog, static product pages, persistent Zustand cart, local checkout, WhatsApp order handoff, Supabase-ready order API, and an Arabic admin preview.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Before publishing

1. Replace the placeholder WhatsApp number in `lib/config.ts`.
2. Copy `.env.example` to `.env.local` and add the production site URL.
3. Create a Supabase project, run `supabase/schema.sql`, then add the Supabase URL and service-role key to `.env.local`.
4. Replace or confirm any product price currently set to `null` in `lib/products.ts`.
5. Protect `/admin` with Supabase Auth before giving it to staff. The current admin screen is an editable local preview and stores price changes in the current browser only.

## Commands

```bash
npm run lint
npm run build
npm run start
```

All prices are displayed in new Mauritanian ouguiya (`MRU`). Products without a confirmed price display “السعر عبر واتساب”.
