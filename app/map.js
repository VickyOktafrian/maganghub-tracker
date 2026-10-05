'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

function getColor(jumlah) {
  if (jumlah >= 50) return '#ef4444';
  if (jumlah >= 20) return '#f97316';
  if (jumlah >= 10) return '#eab308';
  if (jumlah >= 5) return '#84cc16';
  return '#4ade80';
}

export default function Map({ points = [] }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    mapRef.current = L.map(divRef.current).setView([-2.5, 118], 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.eachLayer((l) => {
      if (l instanceof L.CircleMarker) l.remove();
    });
    points.forEach((p) => {
      const c = getColor(p.jumlah);
      L.circleMarker([p.lat, p.lng], { radius: Math.sqrt(p.jumlah) * 3, color: c, fillColor: c, fillOpacity: 0.6 })
        .bindPopup(`${p.kota}: ${p.jumlah} lowongan`)
        .addTo(mapRef.current);
    });
  }, [points]);

  return <div ref={divRef} style={{ height: 400, width: '100%' }} />;
}
