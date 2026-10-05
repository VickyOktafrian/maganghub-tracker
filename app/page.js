'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Map = dynamic(() => import('./map'), { ssr: false });

export default function Page() {
  const [data, setData] = useState(null);
  const [alert, setAlert] = useState({ email: '', keyword: '', kota: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setData);
  }, []);

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
        <h2>Top Kota</h2>
        {data.topCities.length === 0 ? (
          <p>Belum ada data.</p>
        ) : (
          <ul style={{ maxHeight: 300, overflowY: 'auto', background: '#111', padding: 16, borderRadius: 4 }}>
            {data.topCities.map(c => <li key={c.kota}>{c.kota}: {c.jumlah}</li>)}
          </ul>
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
