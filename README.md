# Node.js Starter

Starter project Node.js dengan style rapi dan simpel:

- Express server
- Konfigurasi environment via dotenv
- Struktur `src/config`, `src/controllers`, `src/routes`
- Middleware umum: helmet, cors, morgan
- View engine EJS untuk halaman login + master item
- Database local SQLite (`storage/app.db`) or Railway Postgres via `DATABASE_URL`

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
- `DATABASE_URL` (ambil dari Railway PostgreSQL service)
- Optional: `PGSSL=true` jika koneksi PostgreSQL butuh SSL

Saat app start, sistem otomatis:

- pilih Postgres jika `DATABASE_URL` ada, kalau tidak pakai SQLite local
- jalankan schema SQL (`schema.pg.sql` / `schema.sql`)
- jalankan seed default user (`seed.pg.sql` / `seed.sql`)

Jadi tabel dan user default (`superadmin`, `admin`) terbentuk otomatis di Railway.
