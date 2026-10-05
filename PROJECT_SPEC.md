# MagangHub Tracker — PROJECT SPEC (untuk Opencode / VSCode)

> Baca file ini dulu sebelum coding. Jangan buat file di luar struktur yang ditentukan.
> Bahasa: Indonesia. Scope dikunci — yang tidak tertulis di sini = out of scope.

## 1. Ringkasan

**Nama:** MagangHub Tracker
**Tujuan:** Dashboard timeline jumlah lowongan magang + top perusahaan/kota + alert email, dengan data dari API scraper yang sudah ada.
**API sumber:** `https://maganghub.ndav.my.id/`
**Status sumber (2026-10-05):** endpoint hidup tapi return `total: 0, items: []` (periode magang tutup / struktur halaman berubah). Arsitektur harus tahan data kosong.

**3 fitur inti (terkunci):**
1. **Timeline lowongan** — snapshot harian `total_lowongan`, grafik garis 90 hari.
2. **Statistik perusahaan & kota** — top 10 dari history scrape (`GROUP BY`).
3. **Alert keyword+kota** — user simpan email+keyword+kota; sistem cek match (pengiriman email = fase 2, simpan dulu).

**Out of scope (jangan kerjakan sekarang):**
- Peta heatmap (butuh kamus kota→lat/lng, belum ada).
- Kirim email otomatis (butuh SMTP/Resend, fase 2).
- Auth/login, role admin.
- Scraping langsung ke Kemnaker (tetap lewat API yang ada).

## 2. Tech Stack (dikunci, jangan ganti tanpa alasan)

| Lapisan | Pilihan | Versi / catatan |
|---|---|---|
| Framework | Next.js (App Router) | `^16.3.8`, Turbopack dev |
| UI chart | recharts | `^3.10.1` |
| DB driver | `pg` langsung (tanpa ORM) | `^8.23.1` |
| Cron lib | `node-cron` | `^4.6.0` |
| DB | PostgreSQL lokal (Laragon) | `18.6`, database `maganghub` |
| Runtime | Node.js | `v26.7.0` (sudah terinstall) |
| Bahasa | JavaScript (bukan TypeScript) | `.js` semua |

**Kenapa tanpa ORM:** hanya 3 tabel. ORM = overkill. `ponytail:` tambah migration tool (mis. `node-pg-migrate`) kalau tabel > 5 atau multi-dev.

## 3. Prasyarat Lokal (Windows + Laragon)

- Laragon jalan, service PostgreSQL **ON** (port `5432`, user `postgres`, password kosong).
- Path psql: `C:\laragon\bin\postgresql\pgsql\bin\psql.exe`
- Node: `node --version` → v26.x
- Folder project: `C:\Users\User\maganghub-tracker\` (buat baru, kemarin sudah dihapus bersih)
- Tidak perlu Docker. Tidak perlu `psql` di PATH.

**Connection string lokal:**
```
DATABASE_URL=postgres://postgres:@localhost:5432/maganghub
```

## 4. Arsitektur

```
[MagangHub API] --GET /api/scrape/internships--> [scripts/cron.js] --INSERT--> [Postgres]
                                                                            snapshots
                                                                            internships_history
                                                                            alerts
[Browser] --GET /api/stats--> [Next.js API Route] --SELECT--> [Postgres]
[Browser] --POST /api/alerts--> [Next.js API Route] --INSERT--> [Postgres]
```

**Alur data cron (sekali sehari):**
1. `GET {MAGANGHUB_API}/api/scrape/internships?limit=500`
2. Ambil `data.total ?? items.length`, `items = data.items || []`
3. `INSERT INTO snapshots(tanggal, total_lowongan)` — `tanggal` = hari ini (UTC date `YYYY-MM-DD`), `ON CONFLICT (tanggal) DO UPDATE`.
4. Untuk tiap item: `INSERT INTO internships_history(judul, perusahaan, kota, snapshot_id)` dengan mapping defensif (lihat §7).
5. Log satu baris ke stdout. Tidak throw kalau API kosong — simpan `total=0`.

## 5. Struktur Folder (final, jangan tambah file lain di MVP)

```
maganghub-tracker/
├── app/
│   ├── layout.js            # layout gelap minimal
│   ├── page.js              # dashboard (client component): grafik + top + form alert
│   └── api/
│       ├── stats/route.js   # GET timeline + topCompanies + topCities
│       └── alerts/route.js  # POST simpan alert
├── lib/
│   └── db.js                # pg Pool singleton
├── scripts/
│   └── cron.js              # scrape + simpan snapshot, bisa --once / daemon
├── jsconfig.json            # alias @/* -> ./*
├── next.config.js
├── package.json             # scripts: dev, build, start, cron
├── .env.local               # DATABASE_URL, MAGANGHUB_API, CRON_SCHEDULE (jangan commit)
└── .gitignore               # node_modules, .next, .env.local
```

## 6. Database Schema (eksekusi sekali via psql)

```sql
CREATE DATABASE maganghub;

CREATE TABLE snapshots(
  id SERIAL PRIMARY KEY,
  tanggal DATE UNIQUE NOT NULL,
  total_lowongan INT NOT NULL,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE internships_history(
  id SERIAL PRIMARY KEY,
  judul TEXT,
  perusahaan TEXT,
  kota TEXT,
  snapshot_id INT REFERENCES snapshots(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_hist_snapshot ON internships_history(snapshot_id);
CREATE INDEX idx_hist_perusahaan ON internships_history(perusahaan);
CREATE INDEX idx_hist_kota ON internships_history(kota);

CREATE TABLE alerts(
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  keyword TEXT,
  kota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_alerts_email ON alerts(email);
```

**Perintah buat (PowerShell):**
```powershell
& "C:\laragon\bin\postgresql\pgsql\bin\psql.exe" -h localhost -U postgres -c "CREATE DATABASE maganghub;"
```
Lalu jalankan blok `CREATE TABLE` di atas via psql `-d maganghub` atau HeidiSQL (Laragon → Database).

## 7. Kontrak API

### 7.1 Eksternal (sumber, read-only — jangan ubah)

| Method | Path | Query | Return yang dipakai |
|---|---|---|---|
| GET | `/api/scrape/internships` | `keyword, company, limit` | `{ total, items[] }` |
| GET | `/api/scrape/companies` | `order_direction, page, limit, per_page` | referensi saja |
| GET | `/api/scrape/cities` | `order_by, order_direction, page, limit, per_page` | referensi saja |

**Mapping item defensif** (bentuk item belum stabil karena API sedang kosong — kode harus tahan semua varian):
```js
const judul = it.judul || it.title || it.posisi || null;
const perusahaan = it.perusahaan || it.company || it.company_name || null;
const kota = it.kota || it.city || it.lokasi || null;
```
**Aturan:** kalau `items` kosong → tetap simpan snapshot `total=0`, skip insert history. Log `notes` dari API kalau ada.

### 7.2 Internal (yang kamu buat)

**GET /api/stats** → `200`
```json
{
  "timeline": [{ "tanggal": "2026-10-05T00:00:00.000Z", "total_lowongan": 0 }],
  "topCompanies": [{ "perusahaan": "PT X", "jumlah": 12 }],
  "topCities": [{ "kota": "Jakarta", "jumlah": 30 }]
}
```
Query:
- timeline: `SELECT tanggal, total_lowongan FROM snapshots ORDER BY tanggal ASC LIMIT 90`
- topCompanies: `SELECT perusahaan, COUNT(*)::int AS jumlah FROM internships_history WHERE perusahaan IS NOT NULL GROUP BY perusahaan ORDER BY jumlah DESC LIMIT 10`
- topCities: sama dengan `kota`.

**POST /api/alerts** — body `{ email, keyword?, kota? }`
- validasi: `email` mengandung `@`, kalau tidak → `400 { error: 'email tidak valid' }`.
- sukses → `200 { ok: true }`.

## 8. Isi File (spesifikasi, bukan template kosong)

### `package.json`
scripts wajib: `dev` (next dev), `build`, `start`, `cron` (`node scripts/cron.js`). Dependencies: `next, react, react-dom, pg, node-cron, recharts`. Tanpa `"type": "commonjs"` (Next butuh default CJS root + ESM di `app/` — biarkan default).

### `lib/db.js`
`pg.Pool` singleton baca `process.env.DATABASE_URL`. Export `db.query(text, params)`.

### `scripts/cron.js` (CommonJS, `require`)
- `scrapeOnce()`: fetch → insert snapshot (upsert per tanggal) → insert history per item → `console.log` satu baris.
- CLI: `node scripts/cron.js --once` = sekali jalan. Tanpa argumen = daemon `node-cron` sesuai `CRON_SCHEDULE` + jalan sekali saat start.
- Default: `DATABASE_URL=postgres://postgres:@localhost:5432/maganghub`, `API=https://maganghub.ndav.my.id`, schedule default `0 2 * * *`.
- Error: catch, `console.error`, jangan crash daemon.

### `app/api/stats/route.js` — `export async function GET()`, return `Response.json(...)`.
### `app/api/alerts/route.js` — `export async function POST(req)`, validasi email, insert, return json.
### `app/layout.js` — `<html lang="id">`, body dark (`#0a0a0f`, font system-ui).
### `app/page.js` — `'use client'`; fetch `/api/stats` sekali; `recharts` LineChart (timeline) + BarChart vertical (topCompanies); `<ul>` topCities; form alert (email/keyword/kota) POST ke `/api/alerts`; pesan sukses/gagal. Kalau `timeline` kosong tampilkan teks: "Belum ada snapshot — jalankan: npm run cron -- --once" (catatan: script cron pakai `--once`; sesuaikan pesan di UI jadi `node scripts/cron.js --once`).

### `.env.local`
```
DATABASE_URL=postgres://postgres:@localhost:5432/maganghub
MAGANGHUB_API=https://maganghub.ndav.my.id
CRON_SCHEDULE=0 2 * * *
```

## 9. Urutan Pengerjaan di Opencode (fase, jangan dilompat)

**Fase 0 — DB:** buat DB + 3 tabel + index (§6). Verifikasi: `\dt` tampil 3 tabel.
**Fase 1 — Scaffold:** `npm init -y` + install deps + tulis `package.json` scripts, `next.config.js`, `jsconfig.json`, `.gitignore`, `.env.local`.
**Fase 2 — DB lib + cron:** tulis `lib/db.js`, `scripts/cron.js`. Verifikasi: `node scripts/cron.js --once` → log snapshot; cek `SELECT * FROM snapshots;` ada 1 baris hari ini.
**Fase 3 — API internal:** tulis `stats/route.js`, `alerts/route.js`. Verifikasi: `npm run dev` → `GET /api/stats` return JSON §7.2; `POST /api/alerts` dengan email valid → `{"ok":true}`, cek baris di tabel `alerts`.
**Fase 4 — Dashboard:** tulis `layout.js`, `page.js`. Verifikasi: buka `http://localhost:3000`, grafik render (1 titik dulu wajar), form alert simpan.
**Fase 5 — Rapi-rapi:** `npm run build` harus sukses. Hapus `console.log` debug, pastikan `.env.local` tidak ke-commit.

**Prompt siap-copy per fase untuk Opencode:**
- F0: "Buatkan SQL sesuai section 6 file PROJECT_SPEC ini. Jangan lanjut sebelum saya konfirmasi tabel ada."
- F1: "Scaffold Next.js sesuai section 5 dan 8 (package.json, next.config.js, jsconfig.json, .env.local, .gitignore). Jangan tulis code fitur dulu."
- F2: "Implementasikan lib/db.js dan scripts/cron.js persis section 8 + mapping defensif section 7.1."
- F3: "Implementasikan kedua API route sesuai section 7.2."
- F4: "Implementasikan dashboard sesuai section 8 (page.js)."
- Aturan global tiap prompt: "Ikuti PROJECT_SPEC ini. Jangan tambah dependency. Jangan ubah schema. Kalau API eksternal return kosong, tetap simpan snapshot 0."

## 10. Testing Checklist (Definition of Done)

- [ ] `node scripts/cron.js --once` exit 0, log `snapshot YYYY-MM-DD: N lowongan`.
- [ ] `SELECT COUNT(*) FROM snapshots;` ≥ 1.
- [ ] `GET /api/stats` → JSON dengan 3 key (timeline, topCompanies, topCities).
- [ ] `POST /api/alerts` email valid → `{"ok":true}` + baris di DB; email invalid → 400.
- [ ] `http://localhost:3000` render tanpa error console; grafik tampil (boleh 1 titik).
- [ ] `npm run build` sukses.
- [ ] `.env.local` ada dan tidak ter-commit.

## 11. Edge Cases & Troubleshooting

1. **API return `total: 0, items: []`** → normal saat periode tutup. Tetap simpan snapshot. Jangan retry spam.
2. **`fetch failed / timeout`** → cron log error, snapshot hari itu boleh kosong; cron besok akan upsert tanggal yang sama (upsert, bukan duplikat).
3. **Bentuk item berubah** (key lain) → mapping defensif §7.1; kalau semua null, simpan apa adanya + catat 1 contoh raw ke log untuk investigasi.
4. **`Port 3000 in use`** → matikan dev server lama dulu; jangan run 2 instance.
5. **`Cannot find module '@next/env'`** → `node_modules` korup (biasanya habis hapus `.next` saat server jalan). Fix: stop server, `rm -rf .next node_modules`, `npm install`.
6. **psql `password authentication failed`** → user `postgres` Laragon default tanpa password via localhost; jangan isi password di connection string.
7. **Timezone tanggal** — `tanggal` pakai UTC date dari cron. Konsisten upsert per hari; jangan pakai `NOW()` sebagai tanggal.

## 12. Roadmap Fase 2 (setelah MVP done, jangan campur)

- Kirim email match (Resend/SMTP) via cron kedua yang join `alerts × internships_history` + kolom `last_sent_at`.
- Kamus `kota → lat,lng` + peta Leaflet (heatmap sebaran).
- Grafik tren per perusahaan (butuh history ≥ 2 minggu).
- Deploy ke server sendiri (Nginx + PM2 + Certbot) — spec terpisah.

---
*Spec ini = source of truth. Kalau Opencode menyarankan hal di luar spec, tolak dan rujuk ke nomor section.*
