const fs = require('fs');
try {
  for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
const cron = require('node-cron');
const db = require('../lib/db');

const API = process.env.MAGANGHUB_API || 'https://maganghub.ndav.my.id';
const SCHEDULE = process.env.CRON_SCHEDULE || '0 2 * * *';

async function scrapeOnce() {
  try {
    const url = `${API}/api/scrape/internships?limit=500`;
    const res = await fetch(url);
    const data = await res.json();

    const total = data.total ?? data.items?.length ?? 0;
    const items = data.items || [];
    const tanggal = new Date().toISOString().split('T')[0]; // UTC date YYYY-MM-DD

    // Upsert snapshot
    const snapRes = await db.query(
      `INSERT INTO snapshots(tanggal, total_lowongan) VALUES($1, $2)
       ON CONFLICT(tanggal) DO UPDATE SET total_lowongan = EXCLUDED.total_lowongan, fetched_at = NOW()
       RETURNING id`,
      [tanggal, total]
    );
    const snapshotId = snapRes.rows[0].id;

    // Insert history per item
    for (const it of items) {
      const judul = it.judul || it.title || it.posisi || null;
      const perusahaan = it.perusahaan || it.company || it.company_name || null;
      const kota = it.kota || it.city || it.lokasi || null;
      await db.query(
        `INSERT INTO internships_history(judul, perusahaan, kota, snapshot_id) VALUES($1, $2, $3, $4)`,
        [judul, perusahaan, kota, snapshotId]
      );
    }

    console.log(`snapshot ${tanggal}: ${total} lowongan`);
    if (data.notes) console.log(`notes: ${data.notes}`);
  } catch (err) {
    console.error('scrape error:', err.message);
  }
}

// CLI: --once = run once; default = daemon
if (process.argv.includes('--once')) {
  scrapeOnce().then(() => process.exit(0));
} else {
  console.log(`cron daemon started (${SCHEDULE})`);
  scrapeOnce(); // run once at start
  cron.schedule(SCHEDULE, scrapeOnce);
}
