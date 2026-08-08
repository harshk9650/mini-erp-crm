# Mini ERP + CRM Operations Portal

An internal operations portal for a wholesale/distribution company, covering Customer CRM,
Product & Inventory management, and Sales Challans with strict stock-accuracy business rules.

## 1. Project Overview

Three teams share one portal:
- **Sales** manages customers and creates sales challans.
- **Warehouse** manages products, stock levels, and stock movement history.
- **Accounts** has read visibility into challans (for invoicing/reconciliation).
- **Admin** has full access to everything.

Core guarantee: **stock can never go negative**, and every challan line item is
**immutable** at the price/name/SKU it was created with — even if the product is edited later.

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, TypeScript, Express.js |
| ORM / DB | Prisma ORM + PostgreSQL |
| Auth | JWT (jsonwebtoken), bcrypt password hashing |
| Validation | Zod |
| Frontend | React + TypeScript (Vite), React Router, Axios |
| Styling | Tailwind CSS |
| Local infra | Docker Compose (Postgres + backend) |

## 3. Repository Structure

```
mini-erp-crm/
├── backend/
│   ├── prisma/schema.prisma       # Data model
│   ├── src/
│   │   ├── index.ts               # Express app entry
│   │   ├── seed.ts                # Seeds 4 role users + sample data
│   │   ├── lib/prisma.ts
│   │   ├── middleware/            # auth (JWT + role guard), error handler
│   │   ├── validation/schemas.ts  # Zod schemas
│   │   ├── utils/                 # ApiError, pagination
│   │   └── routes/                # auth, customers, products, challans
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/                 # Login, Dashboard, customers/, products/, challans/
│   │   ├── layouts/DashboardLayout.tsx
│   │   ├── components/            # ProtectedRoute, StatusBadge
│   │   ├── context/AuthContext.tsx
│   │   └── api/client.ts          # Axios instance + interceptors
│   ├── .env.example
│   └── package.json
├── docker-compose.yml
├── postman_collection.json
└── README.md
```

## 4. How the Server Was Set Up

- Backend is a standard Express app with layered middleware: JSON body parsing → routes →
  404 handler → centralized error handler (`middleware/errorHandler.ts`), which normalizes
  `ApiError`, Zod validation errors, and Prisma unique-constraint errors into one consistent
  JSON shape: `{ "error": { "message": "...", "details": ... } }`.
- Auth is stateless JWT. `requireAuth` verifies the token and attaches `req.user`;
  `requireRole(...)` gates specific routes/actions by role.
- All money/quantity-critical operations (`confirm`, `cancel`, stock movements) run inside
  a Prisma `$transaction` so stock checks and stock writes are atomic — no race condition
  can push stock negative.
- Prisma is the single source of truth for the schema; the frontend never guesses shapes,
  it consumes the REST API only.

## 5. Environment Variables

**backend/.env** (copy from `backend/.env.example`):
```
DATABASE_URL="postgresql://erp_user:erp_password@localhost:5432/mini_erp?schema=public"
JWT_SECRET="replace-this-with-a-long-random-string"
PORT=4000
```

**frontend/.env** (copy from `frontend/.env.example`):
```
VITE_API_URL=http://localhost:4000
```

Never commit real `.env` files — only the `.env.example` templates are checked in.

## 6. Running Locally (step by step)

### Option A — Docker Compose (fastest)
```bash
docker compose up --build
```
This starts Postgres + the backend (auto-runs `prisma db push` and seeds the database).
Backend will be at `http://localhost:4000`.

Then, in a separate terminal, run the frontend (not containerized by default, for fast dev reload):
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Frontend will be at `http://localhost:5173`.

### Option B — Fully manual
```bash
# 1. Start Postgres (any local instance, or use docker for just the DB):
docker run --name mini-erp-pg -e POSTGRES_USER=erp_user -e POSTGRES_PASSWORD=erp_password \
  -e POSTGRES_DB=mini_erp -p 5432:5432 -d postgres:16-alpine

# 2. Backend
cd backend
cp .env.example .env          # adjust DATABASE_URL if needed
npm install
npx prisma generate
npx prisma db push            # creates tables from schema.prisma
npm run seed                  # seeds 4 role users + sample customer/products
npm run dev                   # http://localhost:4000

# 3. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

## 7. Seeded Test Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@erp.local | Password123! |
| Sales | sales@erp.local | Password123! |
| Warehouse | warehouse@erp.local | Password123! |
| Accounts | accounts@erp.local | Password123! |

Also seeded: one sample customer ("Rajesh Traders") and two sample products (SKU-001, SKU-002).

## 8. How to Deploy (free-tier hosting)

**Database:** Create a free Postgres instance on [Neon](https://neon.tech) or
[Supabase](https://supabase.com). Copy the connection string into `DATABASE_URL`.

**Backend (Render example):**
1. Push this repo to GitHub.
2. On Render: New → Web Service → connect the repo, root directory `backend`.
3. Build command: `npm install && npx prisma generate && npm run build`
4. Start command: `npx prisma db push && node dist/index.js`
5. Add env vars `DATABASE_URL` and `JWT_SECRET` in the Render dashboard.
6. Deploy — note the public URL (e.g. `https://mini-erp-backend.onrender.com`).

**Frontend (Vercel example):**
1. New Project → import the repo, root directory `frontend`.
2. Framework preset: Vite. Build command: `npm run build`. Output dir: `dist`.
3. Add env var `VITE_API_URL` = your deployed backend URL.
4. Deploy.

**Railway/Fly.io** work the same way — set the same env vars and build/start commands.

### Optional AWS bonus path
- Backend: containerize with the provided `backend/Dockerfile`, push to ECR, run on
  Fargate/App Runner behind an ALB.
- DB: RDS for PostgreSQL.
- Frontend: build (`npm run build`) and serve the static `dist/` from S3 + CloudFront.
- Secrets (`JWT_SECRET`, `DATABASE_URL`) via AWS Secrets Manager / SSM Parameter Store,
  injected as task environment variables — never baked into the image.

## 9. Known Limitations / Incomplete Parts

- No automated test suite (unit/integration tests) is included — out of scope for this pass.
- No password-reset / user-management UI; users are seeded directly via `seed.ts`.
- Low-stock is computed by comparing `currentStock <= minStock`; there's no push/email
  notification, only an in-app badge/dashboard count.
- No PDF export, S3 image upload, or CI/CD workflow — these were explicitly listed as
  bonus items and are not implemented in this pass.
- Frontend does not paginate the customer/product dropdown selectors in the challan builder
  beyond the first 100–200 records (`pageSize` query param) — fine for a mid-size catalog,
  but a searchable async-select would be needed at larger scale.
- No optimistic UI/rollback; all writes wait for the server response before navigating.

## 10. Assumptions Made

1. **Roles and challan actions**: Warehouse users are allowed to confirm/cancel challans
   (in addition to Admin/Sales) because in most wholesale operations the warehouse team is
   the one physically fulfilling and dispatching the order — they were given confirm/cancel
   rights but not challan *creation* rights, which stays with Sales/Admin.
2. **Accounts role**: Accounts is read-only across the app (can view challans/customers/
   products via the challan list, since totals/pricing snapshots live there) but cannot
   create or edit records — matching "read view" in the spec.
3. **currentStock is never directly editable** via the product edit form once a product
   exists — it can only change through a stock movement or a challan confirm/cancel. This
   protects the append-only movement log as the source of truth for all stock changes.
4. **Challan numbering**: sequential, formatted `CH-<year>-<5-digit-sequence>` reset
   conceptually per calendar year (not enforced by a separate counter table — for a real
   production system with concurrent writes at scale, a dedicated atomic sequence/counter
   would be safer than `count()`-based numbering).
5. **GST number and email are optional** on the customer form, since not all leads have
   them at first contact.
6. **Follow-up notes are append-only** (no edit/delete) to preserve an accurate CRM audit
   trail of who said what and when.
7. Cancelling a **DRAFT** challan just marks it Cancelled (no stock effect, since drafts
   never touched stock). Cancelling a **CONFIRMED** challan restores stock and logs an IN
   movement referencing the challan.
8. Single currency assumed (displayed as ₹ in the UI); no multi-currency handling.

## 11. Architecture

### 11.1 Data Model (ASCII ERD)

```
 User (id, name, email, role, passwordHash)
   │ 1
   │  ┌──────────────┐
   ├─►│ CustomerNote │◄── authorId
   │  └──────────────┘
   │ 1
   ├─►│ StockMovement │◄── createdById
   │ 1
   └─►│ Challan        │◄── createdById
                │
                │ N
 Customer (id, name, mobile, gstNumber, customerType, status, followUpDate)
   │ 1
   ├─► CustomerNote (N)
   └─► Challan (N)

 Product (id, name, sku, unitPrice, currentStock, minStock, location)
   │ 1
   ├─► StockMovement (N)   -- append-only log: IN/OUT, qty, reason, createdBy, timestamp
   └─► ChallanItem (N)

 Challan (id, challanNumber, customerId, status: DRAFT|CONFIRMED|CANCELLED, totalQuantity)
   │ 1
   └─► ChallanItem (N)
         - productId (FK, for reference)
         - productNameSnapshot, skuSnapshot, priceSnapshot   ← frozen at creation time
         - quantity, lineTotal
```

### 11.2 Stock / Challan Business Logic Flow

```mermaid
flowchart TD
    A[Sales creates Challan] --> B{Save as?}
    B -->|Draft| C[Challan status = DRAFT<br/>Stock untouched<br/>Line items snapshot product name/SKU/price]
    B -->|Confirm directly| D[Validate stock for every line item]
    C -->|Later: Confirm| D
    D --> E{All items have<br/>enough stock?}
    E -->|No| F[Reject with 400<br/>'Insufficient stock for X: requested N, available M']
    E -->|Yes, all pass| G[Transaction:<br/>decrement Product.currentStock per item<br/>+ create StockMovement OUT per item<br/>+ set Challan.status = CONFIRMED]
    G --> H[Challan CONFIRMED]
    H -->|Cancel| I[Transaction:<br/>increment Product.currentStock per item<br/>+ create StockMovement IN per item<br/>+ set Challan.status = CANCELLED]
    C -->|Cancel draft| J[Challan.status = CANCELLED<br/>No stock effect — draft never touched stock]
```

Key correctness guarantees enforced in code (`backend/src/routes/challans.ts`):
- Stock availability is **re-checked inside the same DB transaction** that performs the
  decrement, not just at "add to challan" time — this avoids a race where two challans
  are confirmed concurrently against the same limited stock.
- A challan can only move `DRAFT → CONFIRMED → CANCELLED` (or `DRAFT → CANCELLED` directly);
  attempting to confirm a non-draft challan returns `409 Conflict`.
- Every stock-affecting action writes an immutable `StockMovement` row, so `GET
  /products/:id/movements` is a complete, tamper-proof audit trail of every unit that ever
  moved in or out, whether from manual warehouse entry or a challan.

## 12. API Summary

See `postman_collection.json` for the full request/response set with sample bodies per
role. Endpoints: `POST /auth/login`, `GET /auth/me`, `GET/POST/PUT /customers`,
`POST /customers/:id/notes`, `GET/POST/PUT /products`, `GET/POST /products/:id/movements`,
`GET/POST /challans`, `POST /challans/:id/confirm`, `POST /challans/:id/cancel`.

All list endpoints support `page`, `pageSize` and return
`{ data: [...], pagination: { page, pageSize, total, totalPages } }`. All errors return
`{ error: { message, details } }` with the correct HTTP status (400/401/403/404/409/500).
