// Kamus kota → koordinat (tambah manual saat kota baru muncul dari scrape)
export const cityCoords = {
  jakarta: [-6.2, 106.816666],
  bogor: [-6.595038, 106.816635],
  depok: [-6.402484, 106.794243],
  tangerang: [-6.170166, 106.640733],
  bekasi: [-6.23827, 106.975573],
  bandung: [-6.917464, 107.619125],
  semarang: [-6.966667, 110.416664],
  yogyakarta: [-7.79558, 110.36949],
  surabaya: [-7.250445, 112.768845],
  malang: [-7.96662, 112.632632],
  denpasar: [-8.670458, 115.212631],
  medan: [3.595196, 98.672226],
  palembang: [-2.990934, 104.756554],
  makassar: [-5.147665, 119.432732],
  padang: [-0.947083, 100.360456],
  pekanbaru: [0.507068, 101.447777],
  balikpapan: [-1.237925, 116.852856],
  samarinda: [0.49483, 117.143615],
  banjarmasin: [-3.318607, 114.594378],
  manado: [1.47483, 124.842079],
};

export function normalizeCity(name) {
  if (!name) return null;
  return name.toLowerCase()
    .trim()
    .replace(/^(kota|kab\.|kabupaten)\s+/i, '')
    .replace(/\s+/g, ' ');
}
// ponytail: saat kota > 100, pindah ke DB atau fetch Nominatim API (rate limit 1 req/s).
