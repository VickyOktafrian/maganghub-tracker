'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { provinceOf } from '@/lib/city-coords';

const Map = dynamic(() => import('./map'), { ssr: false });

export default function Page() {
  const [data, setData] = useState(null);
  const [alert, setAlert] = useState({ email: '', keyword: '', kota: '' });
  const [msg, setMsg] = useState('');
  const [provFilter, setProvFilter] = useState('Semua');
  const [q, setQ] = useState({ keyword: '', company: '' });
  const [results, setResults] = useState(null);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setData);
  }, []);

  const submitSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/search?keyword=${encodeURIComponent(q.keyword)}&company=${encodeURIComponent(q.company)}`);
      setResults(await res.json());
    } catch (err) {
      setResults({ total: 0, items: [], notes: ['Gagal fetch: ' + err.message] });
    }
  };

  const submitAlert = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
    setMsg(res.ok ? '✓ Alert disimpan' : '✗ Email tidak valid');
    if (res.ok) setAlert({ email: '', keyword: '', kota: '' });
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1>MagangHub Tracker</h1>

      {data.timeline.length === 0 && (
        <p style={{ background: '#222', padding: 12, borderRadius: 4 }}>
          Belum ada snapshot — jalankan: <code>node scripts/cron.js --once</code>
        </p>
      )}

      <section style={{ marginTop: 32 }}>
        <h2>Timeline Lowongan (90 hari)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data.timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="tanggal" stroke="#999" />
            <YAxis stroke="#999" />
            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
            <Line type="monotone" dataKey="total_lowongan" stroke="#4ade80" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Top 10 Perusahaan</h2>
        {data.topCompanies.length === 0 ? (
          <p>Belum ada data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topCompanies} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#999" />
              <YAxis dataKey="perusahaan" type="category" stroke="#999" width={90} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
              <Bar dataKey="jumlah" fill="#4ade80" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Peta Sebaran Lowongan</h2>
        <Map points={data.mapPoints} />
        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, flexWrap: 'wrap' }}>
          {[['#4ade80', '1–4'], ['#84cc16', '5–9'], ['#eab308', '10–19'], ['#f97316', '20–49'], ['#ef4444', '50+']].map(([c, t]) => (
            <span key={t}><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: c, marginRight: 4 }} />{t}</span>
          ))}
        </div>
        {data.mapPoints.length === 0 && <p style={{ color: '#999' }}>Belum ada lowongan — peta akan terisi otomatis setelah scrape ada data.</p>}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Top Provinsi</h2>
        {!data.topProvinces || data.topProvinces.length === 0 ? (
          <p>Belum ada data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.topProvinces} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#999" />
              <YAxis dataKey="provinsi" type="category" stroke="#999" width={110} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333' }} />
              <Bar dataKey="jumlah" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Top Kota</h2>
        {data.topCities.length === 0 ? (
          <p>Belum ada data.</p>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>
              <label style={{ marginRight: 8 }}>Filter Provinsi:</label>
              <select value={provFilter} onChange={e => setProvFilter(e.target.value)} style={{ padding: 6, background: '#111', border: '1px solid #333', color: '#e5e5e5', borderRadius: 4 }}>
                <option>Semua</option>
                {[...new Set(data.topCities.map(c => provinceOf(c.kota)))].sort().map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <ul style={{ maxHeight: 300, overflowY: 'auto', background: '#111', padding: 16, borderRadius: 4 }}>
              {data.topCities.filter(c => provFilter === 'Semua' || provinceOf(c.kota) === provFilter).map(c => <li key={c.kota}>{c.kota}: {c.jumlah}</li>)}
            </ul>
          </>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Cari Lowongan Live</h2>
        <form onSubmit={submitSearch} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input type="text" placeholder="Keyword (misal: backend)" value={q.keyword} onChange={e => setQ({ ...q, keyword: e.target.value })} style={{ flex: '1 1 200px', padding: 8, background: '#111', border: '1px solid #333', color: '#e5e5e5', borderRadius: 4 }} />
          <input type="text" placeholder="Perusahaan (opsional)" value={q.company} onChange={e => setQ({ ...q, company: e.target.value })} style={{ flex: '1 1 200px', padding: 8, background: '#111', border: '1px solid #333', color: '#e5e5e5', borderRadius: 4 }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Cari</button>
        </form>
        {results && (
          <div style={{ marginTop: 12, background: '#111', padding: 12, borderRadius: 4 }}>
            <p><strong>{results.total || 0} lowongan</strong> ditemukan {results.notes && <span style={{ color: '#999', fontSize: 12 }}>({results.notes})</span>}</p>
            {results.items && results.items.length > 0 && (
              <ul style={{ marginTop: 8, maxHeight: 300, overflowY: 'auto' }}>
                {results.items.map((it, i) => (
                  <li key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #222' }}>
                    <strong>{it.judul || it.title || it.posisi || 'Untitled'}</strong><br />
                    <span style={{ fontSize: 13, color: '#999' }}>{it.perusahaan || it.company || it.company_name || 'N/A'} — {it.kota || it.city || it.lokasi || 'N/A'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Alert Lowongan</h2>
        <form onSubmit={submitAlert} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="email"
            placeholder="Email"
            value={alert.email}
            onChange={e => setAlert({ ...alert, email: e.target.value })}
            required
            style={{ flex: '1 1 200px', padding: 8, background: '#111', border: '1px solid #333', color: '#e5e5e5', borderRadius: 4 }}
          />
          <input
            type="text"
            placeholder="Keyword (opsional)"
            value={alert.keyword}
            onChange={e => setAlert({ ...alert, keyword: e.target.value })}
            style={{ flex: '1 1 150px', padding: 8, background: '#111', border: '1px solid #333', color: '#e5e5e5', borderRadius: 4 }}
          />
          <input
            type="text"
            placeholder="Kota (opsional)"
            value={alert.kota}
            onChange={e => setAlert({ ...alert, kota: e.target.value })}
            style={{ flex: '1 1 150px', padding: 8, background: '#111', border: '1px solid #333', color: '#e5e5e5', borderRadius: 4 }}
          />
          <button type="submit" style={{ padding: '8px 16px', background: '#4ade80', color: '#000', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
            Simpan Alert
          </button>
        </form>
        {msg && <p style={{ marginTop: 8, color: msg.startsWith('✓') ? '#4ade80' : '#f87171' }}>{msg}</p>}
      </section>
    </div>
  );
}
