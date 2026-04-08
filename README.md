# Node.js Starter

Starter project Node.js dengan style rapi dan simpel:

- Express server
- Konfigurasi environment via dotenv
- Struktur `src/config`, `src/controllers`, `src/routes`
- Middleware umum: helmet, cors, morgan
- View engine EJS untuk halaman login + master item
- Database local SQLite (`storage/app.db`) or MySQL (`mysql2`) via `DATABASE_URL`

## Menjalankan Project

1. Copy `.env.example` menjadi `.env`
2. Install dependency:

```bash
npm install
```

3. Jalankan development mode:

```bash
npm run dev
```

Atau production mode:

```bash
npm start
```

## Endpoint

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me` (Bearer token)
- `GET /api/master-items` (Bearer token)
- `POST /api/master-items` (Bearer token)
- `PUT /api/master-items/:id` (Bearer token)
- `DELETE /api/master-items/:id` (Bearer token)

## Web Pages

- `GET /login`
- `GET /master-items` (login required)

## Default Admin Seed

- Username: `superadmin`
- Password: `master`

## Deploy Railway

Set environment variables in Railway:

- `NODE_ENV=production`
- `PORT` (Railway biasanya inject otomatis)
- `JWT_SECRET`
- `SESSION_SECRET`
- `DATABASE_URL` (ambil dari Railway MySQL service, format `mysql://...`)
- Optional: `MYSQL_SSL=true` jika koneksi MySQL butuh SSL

Saat app start, sistem otomatis:

- pilih MySQL jika `DATABASE_URL` mysql ada, kalau tidak pakai SQLite local
- jalankan schema SQL (`schema.mysql.sql` / `schema.sql`)
- jalankan seed default user (`seed.mysql.sql` / `seed.sql`)

Jadi tabel dan user default (`superadmin`, `admin`) terbentuk otomatis di Railway.
