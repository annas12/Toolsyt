# Music Trend Radar

Website riset musik YouTube berbasis React + Vite. Setiap user memasukkan YouTube Data API v3 key miliknya sendiri. Key disimpan hanya di `localStorage` browser.

## Fitur V1
- API key settings + test connection
- Market/country filter
- Genre + subgenre classification
- Period, ranking, video age, minimum views, growth, views/hour
- Detail video dengan tanggal + jam publikasi
- Channel analyzer
- Daftar video channel model grid
- Subscriber, total views, jumlah video
- Estimasi revenue berbasis RPM yang dapat diatur user
- Snapshot lokal untuk menghitung growth antar-sesi browser

## Setup lokal
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Cloudflare Workers Static Assets
```bash
npm run deploy
```

`wrangler.jsonc` sudah disiapkan untuk SPA fallback.

## API Key
Aktifkan **YouTube Data API v3** pada Google Cloud project. Untuk aplikasi browser publik, batasi key dengan:
1. API restriction: YouTube Data API v3 saja.
2. Application restriction: Websites / HTTP referrers.
3. Tambahkan domain Cloudflare/custom domain Anda sebagai referrer.

API key tidak dimasukkan ke source code atau GitHub.

## Catatan data
- Genre/subgenre adalah klasifikasi heuristik aplikasi berdasarkan metadata publik, bukan kategori resmi YouTube.
- Growth memerlukan minimal dua snapshot. V1 menyimpan snapshot di browser user.
- Estimated Revenue bukan data YouTube Analytics. Nilainya adalah proyeksi pihak ketiga berdasarkan `views / 1000 × RPM range`.
