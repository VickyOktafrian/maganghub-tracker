# MagangHub Tracker

Dashboard timeline lowongan magang dari API MagangHub + top perusahaan/kota + alert email.

## Setup

1. Baca `PROJECT_SPEC.md` (dokumentasi lengkap)
2. Buat database: `CREATE DATABASE maganghub;` + jalankan schema di PROJECT_SPEC section 6
3. `npm install`
4. Copy `.env.example` → `.env.local`, sesuaikan `DATABASE_URL`
5. `npm run dev`

## Scripts

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — production server
- `npm run cron` — cron daemon scraper (atau `node scripts/cron.js --once` untuk sekali jalan)

## Tech Stack

Next.js 16 (App Router) • PostgreSQL • recharts • node-cron
