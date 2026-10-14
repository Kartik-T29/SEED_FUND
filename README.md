# IDEAPAD Seed Fund Portal

A production-ready multi-role web application for IDEAPAD (A Business Incubator of ITM Universe) to manage startup seed fund applications.

## Stack
- Next.js 14+ (App Router, TypeScript)
- Tailwind CSS
- PostgreSQL 18
- Prisma ORM
- bcryptjs (auth) & jose (JWT)

## Setup Instructions

1. **Install Prerequisites**: Node.js v22 and PostgreSQL are required.
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Environment Setup**:
   Copy `.env.example` to `.env` and configure your database URL.
   ```bash
   cp .env.example .env
   ```
4. **Database Setup**:
   Generate Prisma client and push the schema.
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. **Seed the Database**:
   Creates Admin, 3 SEC members, and a demo Startup.
   ```bash
   npm run db:seed
   ```
6. **Run Development Server**:
   ```bash
   npm run dev
   ```

## Roles & Authentication

The portal supports three distinct roles with server-enforced authorization boundaries:

- **Startup**: Register, create application, save drafts, accept agreement, submit once, and view status.
- **SEC Member (3 members)**: Evaluates submitted applications via Form A (pre-checks, TRL/MRL/IRL status levels, shared milestones, 12 feasibility questions, evaluation decision, and itemized budget suggestions).
- **Admin**: Views consolidated SEC report, reviews committee consensus, and completes Form B (Grant Evaluation Report).

### Environment Configuration

Configure the following environment variables in `.env` (refer to `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Cryptographically strong random secret (min 32 characters)
- `SESSION_COOKIE_NAME`: Session cookie identifier (default: `ideapad_session`)
- `ADMIN_EMAIL`: Initial admin email address
- `ADMIN_PASSWORD`: Initial admin password (password change enforced on first login)
- `SEC_MEMBER_1_EMAIL`: First SEC member email
- `SEC_MEMBER_1_PASSWORD`: First SEC member initial password
- `SEC_MEMBER_2_EMAIL`: Second SEC member email
- `SEC_MEMBER_2_PASSWORD`: Second SEC member initial password
- `SEC_MEMBER_3_EMAIL`: Third SEC member email
- `SEC_MEMBER_3_PASSWORD`: Third SEC member initial password
- `UPLOAD_DIR`: Path for document uploads (default: `./uploads`)
- `MAX_FILE_SIZE_MB`: Maximum upload file size in MB (default: `5`)
- `SMTP_ENABLED`: Set to `true` to enable email notifications
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port (default: `587`)
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `SMTP_FROM`: Outgoing sender address

## Key Features Implemented

1. **Role-Based Isolation**: Startups, SEC Members, and Admins have completely separated routing boundaries and dashboards (`/dashboard`, `/review`, `/admin`). Middleware protects all routes.
2. **Branding**: The UI is themed precisely using colors extracted from the provided `IdeaPadLogo.png`.
3. **Multi-Step Form**: The infrastructure for the 10-step form is prepared.
4. **Audit & Testing**: Foundational rules are written in Vitest (`src/__tests__`).
5. **Authentication**: Fully functioning email/password auth using bcryptjs and secure HTTP-only cookies.
