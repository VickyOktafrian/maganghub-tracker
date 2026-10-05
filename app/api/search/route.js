const API = process.env.MAGANGHUB_API || 'https://maganghub.ndav.my.id';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get('keyword') || '';
  const company = searchParams.get('company') || '';
  const limit = searchParams.get('limit') || '50';

  const url = `${API}/api/scrape/internships?keyword=${encodeURIComponent(keyword)}&company=${encodeURIComponent(company)}&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();
  
  return Response.json(data);
}
