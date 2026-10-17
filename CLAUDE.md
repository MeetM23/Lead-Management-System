# LeadFlow — Project Rules

Internal Lead Management System. Keep it simple: few files, one way to do each thing.
These rules are binding for every change. If a rule needs to change, update this file in the same change.

## Stack (do not add to it without approval)

- Frontend: React 19, Vite, Tailwind CSS 3, react-router-dom 7, framer-motion, gsap, lucide-react. All API calls go through `src/utils/api.js` (plain `fetch`; no axios).
- Backend: Node.js (ES modules), Express 4, MySQL 8 with Prisma ORM, JWT (`jsonwebtoken`), `bcryptjs`, helmet, cors, express-rate-limit, morgan, multer, read-excel-file (.xlsx) and csv-parse (.csv) for lead import.
- Roles: `admin` and `sales` only.
- Scope: local development only (XAMPP/MariaDB on this computer). Hosting and deployment are out of scope for now; do not add deployment configuration.

## Commands

- Backend: `cd backend && npm run dev` (nodemon) / `npm start` / `npm test`. Entry point: `backend/index.js`.
- Database (Prisma, from `backend/`): `npm run db:check` (test the connection), `npm run db:migrate` (create/apply a migration to `leadflow`), `npm run db:test:setup` (create the tables in `leadflow_test`), `npm run db:generate` (client), `npm run create-admin` (one-time: creates the first admin; accounts are otherwise created by an admin in the app, there is no public registration). Needs `DATABASE_URL` in `backend/.env`. Setup steps are in `README.md`.
- Frontend: `cd frontend && npm run dev` / `npm run build` / `npm run lint`.
- There is no root `package.json`. Run commands inside `backend/` or `frontend/`.

## Target architecture

### Backend (`backend/`)

```
index.js          app setup and route mounting only
config/           db connection, env validation
routes/           endpoint definitions + middleware only
controllers/      HTTP only: read request, call model, send response
models/           ALL database queries (Prisma), validation, API response shapes
prisma/           schema.prisma (tables, indexes, relations) and migrations
middleware/       auth, role check, upload, error handler
constants/        roles, sources (shared values)
utils/            small, genuinely reusable helpers only
```

- **No service layer.** Do not create `services/`. Existing services are being removed during refactoring.
- **Routes**: one file per resource. Declare path, auth middleware, role middleware, controller. No logic.
- **Controllers**: extract input, call model methods, return the response. Business rules that are not database operations (for example "only an admin can edit a lead") live here.
- **Models**: a model is a module in `models/` that exports plain functions (`Lead.findPageForUser`, `User.authenticate`, …). Every Prisma call (`prisma.lead.findMany`, `$transaction`, `$queryRaw`, …) lives there; controllers and other files never touch the Prisma client or `@prisma/client`. Models return plain objects shaped like the API response (the internal integer ID is exposed as the string `_id`; `leadId` and `employeeId` are the public IDs) and never return password hashes.
- A model method that directly concerns the database may hold the logic (for example creating a lead with its ID). Do not move unrelated business logic into models.

### Frontend (`frontend/src/`)

```
pages/        route-level screens
components/   reusable UI pieces
context/      shared state (auth, leads)
layout/       app shell (sidebar, navbar)
utils/        api client and small helpers
constants/    values shared with the backend contract (roles)
```

- **One API client** in `utils/api.js`. It adds the base URL (`VITE_API_URL`) and the auth token, and handles 401 (clear session, redirect to login).
- **No `fetch` or `axios` calls inside page or presentational components.** Pages call functions from contexts or from the API client.
- Pages render UI and call context functions. They do not build URLs or headers.
- Route access is enforced by the backend. `ProtectedRoute` is for UX only, never security.

## Naming

- Files: components and pages `PascalCase.jsx`; everything else `camelCase.js`. Backend files `camelCase.js`, singular model names (`Lead.js`).
- Variables and functions `camelCase`; constants `UPPER_SNAKE_CASE`; React components `PascalCase`.
- Database fields `camelCase`. Reference fields are named for the role (`createdBy`, `assignedTo`), not `userId`.
- Public IDs (`leadId`, `employeeId`) are for URLs and display; foreign keys always use `_id`.
- Routes are plural nouns (`/api/leads`); actions that are not CRUD use a sub-path (`/api/leads/:leadId/assign`).

## API contract and errors

- Success: `{ success: true, data }`. Failure: `{ success: false, message }`. Keep this shape on every endpoint.
- Use one error pattern: throw an error with an HTTP status (for example an `AppError`), handled by the single error middleware. Do not decide status codes by matching `error.message` strings.
- Status codes: 400 invalid input, 401 not authenticated, 403 not allowed, 404 not found, 409 conflict, 500 unexpected.
- Never return stack traces or raw internal error text for 500s.
- **Do not change existing endpoints, request bodies, or response fields during refactoring** unless the change is explicitly approved. Frontend-read fields (`leadId`, `name`, `email`, `phone`, `source`, `createdBy`, `assignedTo`, `createdAt`, `updatedAt`) must be kept.

## Validation

- Validate and sanitize input at the boundary (route/controller) and enforce it in the schema.
- Allow only known fields. Never pass `req.body` or `req.query` straight into a database query or update.
- Query parameters for filtering/sorting must be whitelisted. Reject operator keys (`$…`) and non-string values.
- Enumerated values come from `constants/`, never retyped as string literals.

## Authentication and authorization

- Every `/api` route except register/login requires the auth middleware.
- Role restrictions are declared in the route (`authorize('admin')`), not repeated ad hoc.
- Data scoping is enforced in the model query, not in the UI: a `sales` user can only read or change leads where `assignedTo` is their own id. This scope must not be overridable by query parameters.
- Passwords are hashed with bcrypt. Never return password hashes. Token secret comes from `JWT_SECRET`.
- Roles must never be derived from a hardcoded email address.

## Secrets, config, and logging

- Secrets and environment-specific values live only in environment variables. `.env` files are never committed.
- Every variable the app reads must be listed in `backend/.env.example` / `frontend/.env.example` (names only, no values) and validated at startup.
- Never log passwords, tokens, API keys, connection strings, or full request bodies.
- No `console.log` debugging left in committed code. Use `morgan` for request logs and the error middleware for errors.
- Seed/demo data must never run unless explicitly enabled, and must never run in production.

## Code quality

- No duplicate logic: if the same code appears twice, extract it once, in the right layer.
- No dead code: no unused files, exports, imports, routes, or commented-out blocks.
- No unnecessary abstractions: do not add a layer, wrapper, or helper for a single use.
- No new dependency without a stated reason and approval. Remove packages that are no longer imported.
- Do not add features that were not requested. Do not refactor code unrelated to the task.
- Keep files focused. If a file grows past roughly 300 lines, check whether it is doing more than one job.

## Database

- Define indexes in the schema for every field used to filter or sort in a query.
- Do not rely on `count()+1` or similar patterns for identifiers. Lead IDs come from the `counters` table, incremented in the same transaction that inserts the lead.
- Change the schema only through Prisma migrations (edit `prisma/schema.prisma`, then `npm run db:migrate`). Never edit tables by hand in phpMyAdmin or similar tools; use them to inspect data and take backups.
- Do not run migrations, seeders, or bulk writes against a live database without explicit approval and a backup. Tests that need a real database use a separate `*_test` database (`TEST_DATABASE_URL`), never the app's `DATABASE_URL`.
- Schema changes must keep existing rows valid, or ship with a reviewed data migration.

## Testing and verification

- Backend: add or update tests for every behavior change, especially authentication, role enforcement, and lead scoping.
- Before finishing any change run: `npm run lint` and `npm run build` in `frontend/`, and start the backend (or its test suite) to confirm it boots.
- Lint error count must not increase. Do not disable lint rules to pass.
- Manually verify the affected flow for both roles (`admin`, `sales`) when behavior changes.

## Git

- Work on `main` (the project is not live). Make small, focused commits; do not commit unless asked.
- Never commit `.env` files, logs, build output, or uploads.
- Never rewrite history, force-push, reset, or clean without explicit approval.

## Working with Claude

- Inspect the code before changing it. State what will change before large edits.
- Preserve existing behavior unless told otherwise. Flag, don't silently fix, unrelated problems.
- Update this file when an approved architectural decision changes.
