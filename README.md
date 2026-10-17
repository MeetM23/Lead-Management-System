# LeadFlow

A lead management app: React (Vite) frontend, Express API, MariaDB/MySQL database through Prisma.
This guide covers running it **on your own computer** with XAMPP.

## What you need

- Node.js 20 or newer
- XAMPP with **Apache** and **MySQL** (MariaDB) running, so phpMyAdmin works at http://localhost/phpmyadmin

## 1. Create the databases (phpMyAdmin)

1. Open http://localhost/phpmyadmin.
2. Click **Databases**, type `leadflow` as the name, choose collation `utf8mb4_unicode_ci`, click **Create**.
3. Repeat for a second database named `leadflow_test` (used only by the automated database tests).

Leave them empty: the tables are created by Prisma in step 3. Never create or edit tables by hand; always change the
schema in `backend/prisma/schema.prisma` and run `npm run db:migrate`.

## 2. Configure the backend

```bash
cd backend
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
```

Open `backend/.env` in an editor and set:

| Setting | What to put |
|---|---|
| `DATABASE_URL` | `mysql://root@localhost:3306/leadflow` for XAMPP's default login (user `root`, no password). If you gave `root` a password: `mysql://root:YOUR_PASSWORD@localhost:3306/leadflow` (URL-encode special characters, e.g. `@` becomes `%40`). |
| `TEST_DATABASE_URL` | the same login, ending in `/leadflow_test` |
| `JWT_SECRET` | a long random value. Generate one with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |

Passwords live only in `backend/.env`, which is git-ignored. Do not put them anywhere else.

Check the connection:

```bash
npm run db:check
```

It reports whether the server is reachable, the login works, and which tables exist (it never prints the password).

## 3. Create the tables

```bash
npm run db:migrate
```

On the first run Prisma asks for a migration name: type `init`. This creates the tables in `leadflow`
(and a `prisma/migrations` folder that should be kept in git). Run `npm run db:check` again to see the tables.

## 4. Start the app

```bash
# terminal 1 - API on http://localhost:5000
cd backend
npm run dev

# terminal 2 - website on http://localhost:5173
cd frontend
npm install
npm run dev
```

There is no public sign-up: accounts are created by an admin. Create the first admin once, in a terminal:

```bash
cd backend
npm run create-admin     # asks for name, employee ID, email and password (the password is hidden)
```

It refuses to run if an admin already exists. Then open http://localhost:5173/login and sign in with the admin's
**email or employee ID** and password. Create employees under **Users → Add Employee** (name, employee ID, email and a
temporary password); they sign in the same way. Admins can deactivate an employee on the user's page, which blocks login.

### Importing leads from Excel or CSV

Only an admin can add or import leads (employees work on the leads assigned to them). On the Leads page choose **Import Leads**: upload a `.xlsx` or `.csv` file (first row = column names), match the columns to
Name / Phone / Email / State / Source, review the errors and possible duplicates, then confirm. Columns you do not
map are kept on each lead under their original header (`customFields`). Imported leads are assigned to the person importing.
Limits (in `backend/.env`, optional): `IMPORT_MAX_FILE_MB` (default 5) and `IMPORT_MAX_ROWS` (default 5000). Old `.xls` files must be
saved as `.xlsx` or `.csv` first.

Leads also have a **State**. An import column named state/State/STATE fills it, and the text is stored exactly as it appears in the file (no list, no correction, no translation). Every other column is kept on the lead under its original header and shown on the lead page. Only an admin can change a lead's state.

### Optional demo data

In `backend/.env` set `ENABLE_SEEDING=true` and `SEED_DEMO_PASSWORD` to a password of 8+ characters, then:

```bash
cd backend
npm run seed
```

This creates `admin@demo.com` and ten sales users (`sales1@demo.com` …) with that password, plus about 300 demo leads.
Seeding refuses to run unless `NODE_ENV=development`.

## 5. Run the tests

```bash
cd backend
npm test                    # unit tests: need no database
npm run db:test:setup       # one time: creates the tables in leadflow_test
npm test                    # now also runs the real-database tests
```

The real-database tests run only when `TEST_DATABASE_URL` is configured and the database name ends in `_test`;
otherwise they are reported as skipped. They empty the tables of that test database, so never point it at `leadflow`.

Frontend checks:

```bash
cd frontend
npm run lint
npm run build
```

## Useful commands (in `backend/`)

| Command | What it does |
|---|---|
| `npm run dev` | start the API with auto-restart |
| `npm run db:check` | test the database connection and list tables |
| `npm run db:migrate` | apply schema changes to `leadflow` (creates a new migration when `schema.prisma` changed) |
| `npm run db:test:setup` | create/update the tables in `leadflow_test` |
| `npm run db:generate` | regenerate the Prisma client (normally automatic) |
| `npm run seed` | create demo data (see above) |
| `npm test` | run all tests |

## Troubleshooting

- **`DATABASE_URL still contains the USER/PASSWORD placeholder`**: edit `backend/.env` as in step 2.
- **`Authentication failed`**: the user or password in `DATABASE_URL` is wrong. Try `mysql://root@localhost:3306/leadflow`.
- **`Can't reach database server`**: start MySQL in the XAMPP control panel.
- **`Unknown database 'leadflow'`**: create it in phpMyAdmin (step 1).
- **The website cannot reach the API**: check the API is running on port 5000 and that `frontend/.env.local`
  (if present) says `VITE_API_URL=http://localhost:5000`.
- **Everyone is signed out after you change `JWT_SECRET`**: expected; log in again.

## Deploying (Vercel frontend + Render backend)

Render and Vercel cannot reach the MariaDB on this computer, so first create a hosted MySQL database
(for example Aiven, TiDB Cloud or Railway) and note its `mysql://` URL (add `?ssl-mode=REQUIRED` or the provider's SSL option if it needs one).

1. **Database**: from `backend/`, run `DATABASE_URL="<hosted url>" npx prisma migrate deploy` once, then `npm run create-admin` against it to make the first admin. Existing local leads are not copied (export/import them with the Import feature or `mysqldump`).
2. **Render** (Web Service, root directory `backend`): Build command `npm install && npx prisma generate`; Start command `npm start`. Environment: `DATABASE_URL`, `JWT_SECRET` (32+ random chars), `NODE_ENV=production`, `CORS_ORIGINS=https://<your-app>.vercel.app`.
3. **Vercel** (root directory `frontend`, framework Vite): Environment variable `VITE_API_URL=https://<your-service>.onrender.com` (no trailing slash). Redeploy after changing it.
4. Open the Vercel address and log in.

Notes: Render's free plan sleeps after inactivity (first request is slow) and its disk is temporary, so uploaded profile pictures are lost on redeploy.

Project rules for contributors are in `CLAUDE.md`.
