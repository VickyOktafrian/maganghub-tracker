export const metadata = { title: 'MagangHub Tracker' };

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body style={{ background: '#0a0a0f', color: '#e5e5e5', fontFamily: 'system-ui', margin: 0, padding: 24 }}>
        {children}
      </body>
    </html>
  );
}
