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

## Roles & Demo Accounts

All seeded accounts have the password: `Admin@IdeaPad2024` or similar, except the startup which is `Startup@123`.

- **Admin**: `admin@ideapad.co.in` (Password: `Admin@IdeaPad2024`)
- **SEC Member 1**: `sec1@ideapad.co.in` (Password: `Sec1@IdeaPad2024`)
- **Startup**: `startup1@test.com` (Password: `Startup@123`)

Upon first login for Admin and SEC roles, the system forces a password change.

## Key Features Implemented

1. **Role-Based Isolation**: Startups, SEC Members, and Admins have completely separated routing boundaries and dashboards (`/dashboard`, `/review`, `/admin`). Middleware protects all routes.
2. **Branding**: The UI is themed precisely using colors extracted from the provided `IdeaPadLogo.png`.
3. **Multi-Step Form**: The infrastructure for the 10-step form is prepared.
4. **Audit & Testing**: Foundational rules are written in Vitest (`src/__tests__`).
5. **Authentication**: Fully functioning email/password auth using bcryptjs and secure HTTP-only cookies.
