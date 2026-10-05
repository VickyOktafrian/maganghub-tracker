# Deploy MagangHub Tracker ke Coolify

**Arsitektur:** 1 Project Coolify, 2 Resources:
- `maganghub-db` → PostgreSQL 16 (Coolify Database Service)
- `maganghub-app` → Next.js + Cron daemon (1 container), domain `cekmagang.frian.dev`

Repo: `https://github.com/VickyOktafrian/maganghub-tracker`, branch `main` (public).

---

## 1. Buat Project + Database

1. Coolify → `Projects` → `+ New Project` → nama `MagangHub Tracker` → `Create`.
2. Buka project → `+ Add Resource` → `Database` → `PostgreSQL 16`.
   - Name: `maganghub-db`
   - Database Name: `maganghub`
   - Username: `postgres`
   - **Password:** dicatat (auto-generated atau set manual)
3. `Start` database → tunggu status `Running`.

### Init Schema (sekali saja)

Buka `maganghub-db` → `Logs & Terminal` → `Execute Command`, paste:

```sql
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

Verifikasi: query `\dt` tampil 3 tabel (snapshots, internships_history, alerts).

---

## 2. Deploy App

1. Dalam project → `+ Add Resource` → `Application` → pilih source Public Repository.
2. Konfigurasi:
   - **Repository:** `VickyOktafrian/maganghub-tracker`
   - **Branch:** `main`
   - **Build Method:** `Dockerfile` (root `./Dockerfile`, default)
   - **Port:** `3000`
   - **Domains:** `cekmagang.frian.dev`
3. Tab **Environment Variables** → add:

```
DATABASE_URL=postgres://postgres:<PASSWORD>@maganghub-db:5432/maganghub
MAGANGHUB_API=https://maganghub.ndav.my.id
CRON_SCHEDULE=0 2 * * *
NODE_ENV=production
```

**Penting hostname DB:** pakai nama service persis di Coolify. Kalau nama DB di dashboard adalah `maganghub-db`, hostname = `maganghub-db`. Kalau Coolify auto-generate jadi `postgresql-abc123`, ganti hostname jadi itu. **Jangan pakai `localhost`** — hostname harus nama container DB.

4. `Deploy` → tunggu build (~3-5 menit) → status `Running`.

**Container ini jalan 2 proses:**
- Next.js web server (port 3000)
- Node-cron daemon (scraper jalan 1× saat start + otomatis tiap `CRON_SCHEDULE`)

Log sukses: `cron daemon started (0 2 * * *)` + `snapshot YYYY-MM-DD: N lowongan`.

---

## 3. DNS

Di DNS provider domain `frian.dev`:
- **Type:** `A` atau `CNAME`
- **Name:** `cekmagang`
- **Value:** IP server Coolify atau hostname (cek di Coolify → `Settings` → `Server`)
- **TTL:** 300

Coolify auto-provision SSL via Let's Encrypt. Tunggu DNS propagate (~5 menit).

Verifikasi: `curl https://cekmagang.frian.dev` harus return HTML Next.js.

---

## 4. Verifikasi

### HTTP endpoint:
```bash
curl https://cekmagang.frian.dev/api/stats
```
Harus return JSON dengan keys: `timeline`, `topCompanies`, `topCities`, `mapPoints`, `topProvinces`.

### Database snapshot:
Di `maganghub-db` terminal:
```sql
SELECT COUNT(*) FROM snapshots;
-- harus ≥ 1 setelah cron jalan 1× (saat deploy pertama + tiap jam 2 pagi)
```

### Log cron:
`maganghub-app` → `Logs` → cari `snapshot YYYY-MM-DD: N lowongan` + notes dari API.

---

## Troubleshooting

| Masalah | Penyebab | Fix |
|---------|----------|-----|
| Build fail: `COPY failed` | Branch belum push `Dockerfile` / `output: 'standalone'` | Push commit terbaru ke `main`, redeploy |
| App crash: `ECONNREFUSED` | `DATABASE_URL` hostname salah | Ganti `localhost` → nama service DB persis dari Coolify dashboard |
| `password authentication failed` | Password DB salah | Copy ulang password dari tab `maganghub-db` → Environment Variables |
| Grafik/peta kosong | `snapshots`/`internships_history` kosong | Normal di awal; tunggu cron jalan (cek log app) atau seed manual |
| Search timeout / error | API eksternal `maganghub.ndav.my.id` lambat/down | Bukan bug — route sudah tahan kosong, return JSON error |
| Cron tidak jalan | Container restart / env `CRON_SCHEDULE` salah format | Cek log container: `cron daemon started` harus muncul; cek format cron (default `0 2 * * *` = jam 2 pagi) |

---

## Update Kode (Push Update)

1. Commit + push ke `main`:
   ```bash
   git add .
   git commit -m "feat: update xyz"
   git push origin main
   ```
2. Coolify → `maganghub-app` → `Redeploy` (atau auto-deploy kalau webhook aktif).
3. Tunggu build baru, container restart otomatis.

---

## Rollback

Coolify → `maganghub-app` → `Deployments` → pilih deployment sebelumnya → `Redeploy`.
