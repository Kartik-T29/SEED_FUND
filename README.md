# IDEAPAD Seed Fund Portal

A production-ready multi-role web application for IDEAPAD (A Business Incubator of ITM Universe) to manage startup seed fund applications, evaluations, and disbursements.

## Stack
- Next.js 14+ (App Router, TypeScript)
- Tailwind CSS
- PostgreSQL
- Prisma ORM
- bcryptjs (auth) & jose (JWT)

## Setup Instructions

1. **Install Prerequisites**: Node.js v20+ and PostgreSQL are required.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Environment Setup**:
   Copy `.env.example` to `.env` and configure your database URL.
   ```bash
   cp .env.example .env
   ```
4. **Database Setup & Migrations**:
   Run database migrations to initialize the schema:
   ```bash
   npm run build # runs prisma generate && prisma migrate deploy && next build
   ```
   Or locally for dev:
   ```bash
   npx prisma migrate dev
   ```
5. **Seed the Initial Admin**:
   Seeds the initial administrator account from environment variables (`ADMIN_EMAIL` and `ADMIN_PASSWORD`):
   ```bash
   npm run db:seed
   ```
6. **Run Development Server**:
   ```bash
   npm run dev
   ```

## Roles & Authentication

The portal supports three distinct roles with server-enforced authorization boundaries:

- **Startup**: Register via `/register`, create applications, save drafts, accept agreements, submit, and track review status.
- **SEC Member (Seed Evaluation Committee)**:
  - Self-registers via `/sec/register`.
  - New SEC accounts are created in `PENDING` status and require Administrator approval before gaining access to the evaluation dashboard.
  - Optional invite code protection via `SEC_INVITE_CODE` environment variable.
  - Approved SEC members evaluate applications via Form A (pre-checks, TRL/MRL/IRL maturity levels, shared committee milestones, 12 feasibility questions, and budget recommendations).
- **Admin**:
  - Approves, rejects, or deactivates SEC member accounts via the User Management panel with audit logging.
  - Views the consolidated SEC report, committee reviews, and sanctions Form B (Grant Evaluation Report).

## Environment Configuration

Configure the following environment variables in `.env` (refer to `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Cryptographically strong random secret (min 32 characters)
- `SESSION_COOKIE_NAME`: Session cookie identifier (default: `ideapad_session`)
- `ADMIN_EMAIL`: Initial admin email address
- `ADMIN_PASSWORD`: Initial admin password (password change enforced on first login)
- `SEC_INVITE_CODE`: Optional invite code for SEC member registration (if set, registration requires this code)
- `FRONTEND_URL`: Public domain URL of the deployed application (for CORS and proxy headers)
- `PORT`: Port on which the application server listens (default: `3000`)
- `NODE_ENV`: Set to `production` in production deployment
- `UPLOAD_DIR`: Path for document uploads (default: `./uploads`)
- `MAX_FILE_SIZE_MB`: Maximum upload file size in MB (default: `5`)
- `SMTP_ENABLED`: Set to `true` to enable email notifications
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port (default: `587`)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `SMTP_FROM`: Outgoing sender address

## Deployment Behind Cloudflare / University Reverse Proxy

When deploying on a university server behind Cloudflare or a reverse proxy:
1. **Health Check Endpoint**: `/health` (and `/api/health`) responds with `200 OK` JSON without touching sensitive data or the database.
2. **Client IP Resolution**: Rate limiters and audit logs inspect the `CF-Connecting-IP` header first, falling back to `X-Forwarded-For` and `X-Real-IP`.
3. **Secure Cookies & HTTPS**: When `NODE_ENV=production`, session cookies are marked `Secure`, `HttpOnly`, with `SameSite=Lax`.
4. **Binding**: The server binds to `0.0.0.0` and listens on `process.env.PORT || 3000`.
