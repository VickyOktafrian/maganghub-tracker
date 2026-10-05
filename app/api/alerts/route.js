import db from '@/lib/db';

export async function POST(req) {
  const { email, keyword = null, kota = null } = await req.json();
  if (!email || !email.includes('@')) {
    return Response.json({ error: 'email tidak valid' }, { status: 400 });
  }
  await db.query('INSERT INTO alerts(email, keyword, kota) VALUES($1, $2, $3)', [email, keyword, kota]);
  return Response.json({ ok: true });
}
