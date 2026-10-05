import db from '@/lib/db';
import { cityCoords, normalizeCity, provinceOf } from '@/lib/city-coords';

export async function GET() {
  const timeline = (await db.query(
    'SELECT tanggal, total_lowongan FROM snapshots ORDER BY tanggal ASC LIMIT 90'
  )).rows;
  const topCompanies = (await db.query(
    'SELECT perusahaan, COUNT(*)::int AS jumlah FROM internships_history WHERE perusahaan IS NOT NULL GROUP BY perusahaan ORDER BY jumlah DESC LIMIT 10'
  )).rows;
  const topCities = (await db.query(
    'SELECT kota, COUNT(*)::int AS jumlah FROM internships_history WHERE kota IS NOT NULL GROUP BY kota ORDER BY jumlah DESC LIMIT 50'
  )).rows;
  const mapPoints = topCities.flatMap(({ kota, jumlah }) => {
    const coords = cityCoords[normalizeCity(kota)];
    return coords ? [{ kota, jumlah, lat: coords[0], lng: coords[1] }] : [];
  });
  const provGroup = {};
  topCities.forEach(({ kota, jumlah }) => {
    const prov = provinceOf(kota);
    provGroup[prov] = (provGroup[prov] || 0) + jumlah;
  });
  const topProvinces = Object.entries(provGroup).map(([provinsi, jumlah]) => ({ provinsi, jumlah })).sort((a, b) => b.jumlah - a.jumlah).slice(0, 10);
  return Response.json({ timeline, topCompanies, topCities, mapPoints, topProvinces });
}
