# IDEAPAD Seed Fund Portal: Deployment Guide for ERP Cell

**Prepared by:** Kartik (B.Tech IT, ITM Gwalior) for the ERP Cell, ITM University  
**Version:** 1.0  
**Date:** October 2026  
*Note: Items in `[square brackets]` must be filled in by the ERP Cell or the developer before go-live.*

---

## 1. Purpose and Scope
This guide explains how to host the **IDEAPAD Seed Fund Portal** on a university server and make it reachable from the internet through Cloudflare. It covers server requirements, configuration, installation, Cloudflare setup, security, backups, updates, and troubleshooting.

The portal provides an end-to-end grant management lifecycle:
- **Startups**: Register accounts, apply for grant funding across innovation tiers (Ideation, Validation, Proof-of-Concept, Scaling, Emergency), upload pitch decks, budgets, and compliance documentation, and track real-time application status.
- **Seed Evaluation Committee (SEC)**: Review applications, conduct pre-assessment checks, score TRL/MRL/IRL maturity levels, assess 12 feasibility questions, collaborate on shared milestone tracking, and submit Form A recommendations.
- **Administrator (Incubation / ERP Director)**: Review committee submissions side-by-side on the consolidated dashboard, approve/reject SEC registrations, and complete Form B grant evaluation approvals.

---

## 2. System Overview
- **Application Framework**: Next.js 14+ (Node.js) using App Router with React Server Components (RSC) and Server Actions.
- **Database**: PostgreSQL 14+ accessed via Prisma ORM with connection pooling.
- **User Roles**: `STARTUP`, `SEC_MEMBER`, `ADMIN`.
- **Account Creation**:
  - **Startups**: Self-register via `/register`.
  - **SEC Members**: Self-register via `/sec/register`. New accounts are created in `PENDING` status and cannot log in or view applications until approved by an administrator. An optional institutional invite code (`SEC_INVITE_CODE`) can be enforced.
  - **Administrator**: The primary administrator account is created once during initial deployment via environment variables (`ADMIN_EMAIL` and `ADMIN_PASSWORD`).

---

## 3. Architecture
Internet users connect to Cloudflare edge nodes over HTTPS. Cloudflare forwards traffic to the university origin server, either through a Cloudflare Tunnel (recommended) or through a proxied DNS record. On the server, the Next.js application binds to `0.0.0.0` listening on port `3000`, while PostgreSQL listens exclusively on `localhost` (127.0.0.1).

- **Browser to Cloudflare**: HTTPS (TLS 1.2/1.3 with Cloudflare Universal/Custom SSL).
- **Cloudflare to Origin Server**:
  - **Option A (Recommended)**: Outbound Cloudflare Tunnel (`cloudflared`). No inbound firewall ports required.
  - **Option B**: Reverse proxy via Nginx with Cloudflare Origin Certificate, allowing traffic only from Cloudflare IP ranges.
- **Next.js App to PostgreSQL**: Secure Unix socket or `localhost:5432` only; never exposed to public or campus networks.

```
[ Internet / Browser ] 
        │ (HTTPS)
        ▼
[ Cloudflare Edge (WAF, DDoS, SSL) ]
        │
   ┌────┴─────────────────────────────┐
   │ (Option A: Cloudflare Tunnel)     │ (Option B: Proxied DNS + Nginx)
   ▼                                   ▼
[ cloudflared daemon ]            [ Nginx Reverse Proxy ]
   │ (localhost:3000)                  │ (localhost:3000)
   └─────────────────┬─────────────────┘
                     ▼
           [ Next.js Node Server ]
                     │ (localhost:5432)
                     ▼
             [ PostgreSQL DB ]
```

---

## 4. Server Requirements
- **Operating System**: Ubuntu 22.04 LTS or 24.04 LTS (or the ERP Cell's standard Linux server) `[confirm: Ubuntu 24.04 LTS]`.
- **Hardware Resources**:
  - CPU: Minimum 2 vCPU (4 vCPU recommended for concurrent evaluation sessions).
  - RAM: Minimum 4 GB (8 GB recommended).
  - Storage: Minimum 20 GB SSD disk (accounting for document uploads and DB growth).
- **Node.js**: Node.js LTS v20.x or v22.x (matching project `package.json` engines `>=20.0.0 <23.0.0`).
- **PostgreSQL**: Version 14 or newer (PostgreSQL 16 recommended).
- **System Packages**: `git`, `curl`, `build-essential`, `openssl`, `systemd`.
- **Network**: Outbound internet access via HTTPS (TCP 443) for package installation and Cloudflare Tunnel communication.
- **Service User**: Dedicated non-root system user (e.g., `seedfund`).

---

## 5. Information Needed from the ERP Cell
Before deployment, obtain the following parameters from the ERP Cell:

| Parameter | Description | Value |
|---|---|---|
| Server Hostname / IP | Production server IP and SSH gateway | `[fill in: e.g., 10.0.2.50 / erp-app01.itmuniversity.ac.in]` |
| SSH Access | Sudo user credentials or deploy SSH public key | `[fill in]` |
| Domain / Subdomain | Target public domain name | `[fill in: e.g., seedfund.itmuniversity.ac.in]` |
| Cloudflare Account Owner | Admin account managing DNS zone | `[fill in: erp-admin@itmuniversity.ac.in]` |
| Inbound Traffic Policy | Allowed inbound ports (80/443) or outbound-only | `[fill in: Option A (Outbound Only) / Option B (Ports Open)]` |
| Backup Storage Location | Remote NAS/S3/SFTP storage path for DB dumps | `[fill in: e.g., /mnt/backup/seedfund or s3://itm-erp-backups]` |
| SMTP Server Details | Host, port, credentials for notification emails | `[fill in: smtp.itmuniversity.ac.in:587]` |
| ERP Cell Technical Lead | Primary administrative contact person | `[fill in: Name, Phone, Email]` |

---

## 6. Environment Variables
The application reads its configuration from an environment file readable only by the `seedfund` service user (`/etc/seedfund/seedfund.env` with permissions `600`). **Never commit this file to Git.**

Generate secrets using:
```bash
openssl rand -base64 48
```

### Environment Configuration Template (`/etc/seedfund/seedfund.env`)
```bash
# ==============================================================================
# SERVER RUNTIME
# ==============================================================================
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://[fill in: seedfund.itmuniversity.ac.in]
DEMO_MODE=false

# ==============================================================================
# DATABASE (PostgreSQL)
# ==============================================================================
DATABASE_URL="postgresql://seedfund_user:[DB_PASSWORD]@localhost:5432/ideapad_seed_fund?schema=public&sslmode=prefer"

# ==============================================================================
# AUTHENTICATION & SESSIONS
# ==============================================================================
# Generate with: openssl rand -base64 48
JWT_SECRET="[GENERATED_32+_CHARACTER_SECRET]"
SESSION_COOKIE_NAME="ideapad_session"

# ==============================================================================
# INITIAL SEEDED ADMIN (Used ONLY on initial DB seed run)
# ==============================================================================
ADMIN_EMAIL="admin@ideapad.co.in"
ADMIN_PASSWORD="[CHANGE_ME_SECURE_ADMIN_INITIAL_PASSWORD]"

# ==============================================================================
# OPTIONAL SEC REGISTRATION INVITE CODE
# ==============================================================================
# If set, SEC members must provide this code during registration
SEC_INVITE_CODE="[OPTIONAL_CAMPUS_SEC_INVITE_CODE]"

# ==============================================================================
# UPLOADS & STORAGE
# ==============================================================================
UPLOAD_DIR="/opt/seedfund/uploads"
MAX_FILE_SIZE_MB="5"

# ==============================================================================
# SMTP (Optional - set SMTP_ENABLED=true to activate email notifications)
# ==============================================================================
SMTP_ENABLED=false
SMTP_HOST="[smtp.example.com]"
SMTP_PORT=587
SMTP_USER="[smtp_user]"
SMTP_PASS="[smtp_password]"
SMTP_FROM="noreply@ideapad.co.in"
```

---

## 7. Installation Steps

### Step 1: Install Node.js, PostgreSQL, and Git
```bash
# Update system repositories
sudo apt update && sudo apt upgrade -y

# Install Git and build utilities
sudo apt install -y curl git build-essential

# Install Node.js 22 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify versions
node -v   # Expected v20.x or v22.x
npm -v

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
```

### Step 2: Configure PostgreSQL Database and User
```bash
# Open PostgreSQL prompt
sudo -u postgres psql

-- Create database
CREATE DATABASE ideapad_seed_fund;

-- Create dedicated non-root application user
CREATE USER seedfund_user WITH ENCRYPTED PASSWORD '[GENERATE_STRONG_DB_PASSWORD]';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE ideapad_seed_fund TO seedfund_user;
ALTER DATABASE ideapad_seed_fund OWNER TO seedfund_user;

-- Grant schema privileges (PostgreSQL 15+)
\c ideapad_seed_fund
GRANT ALL ON SCHEMA public TO seedfund_user;

\q
```

### Step 3: Create Service User and Clone Repository
```bash
# Create system user without login shell
sudo useradd -r -m -d /opt/seedfund -s /bin/bash seedfund

# Clone repository directly to /opt/seedfund
sudo git clone -b deploy/university-server https://github.com/Kartik-T29/SEED_FUND.git /opt/seedfund
sudo chown -R seedfund:seedfund /opt/seedfund
```

### Step 4: Configure Environment File
```bash
# Create directory for secure environment configuration
sudo mkdir -p /etc/seedfund
sudo cp /opt/seedfund/.env.example /etc/seedfund/seedfund.env

# Edit with production secrets and database credentials
sudo nano /etc/seedfund/seedfund.env

# Lock down permissions (readable ONLY by root and seedfund user)
sudo chown root:seedfund /etc/seedfund/seedfund.env
sudo chmod 640 /etc/seedfund/seedfund.env

# Link .env for build process
sudo -u seedfund ln -sf /etc/seedfund/seedfund.env /opt/seedfund/.env
```

### Step 5: Install Dependencies, Migrate Database, and Seed Admin
```bash
cd /opt/seedfund

# Install production dependencies
sudo -u seedfund npm ci

# Generate Prisma Client
sudo -u seedfund npx prisma generate

# Apply production migrations
sudo -u seedfund npx prisma migrate deploy

# Seed initial admin account (reads credentials from /etc/seedfund/seedfund.env)
sudo -u seedfund npx prisma db seed

# Build the production Next.js bundle
sudo -u seedfund npm run build
```

### Step 6: Verify Local Health Check
```bash
# Test starting the app manually on port 3000
sudo -u seedfund npm start &
PID=$!
sleep 4

# Check health endpoints
curl -s http://localhost:3000/health
# Expected output: {"status":"ok","uptime":...,"timestamp":"..."}

# Terminate manual test instance
kill $PID
```

---

## 8. Process Management (systemd)
Create a managed systemd service to ensure the portal automatically starts on boot and restarts on unexpected crashes.

### Create `/etc/systemd/system/seedfund.service`
```ini
[Unit]
Description=IDEAPAD Seed Fund Portal (Next.js)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=seedfund
Group=seedfund
WorkingDirectory=/opt/seedfund
EnvironmentFile=/etc/seedfund/seedfund.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=seedfund

# Hardening
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### Enable and Start Service
```bash
sudo systemctl daemon-reload
sudo systemctl enable seedfund
sudo systemctl start seedfund

# Verify status
sudo systemctl status seedfund

# Check live logs
sudo journalctl -u seedfund -f
```

---

## 9. Cloudflare Setup
Choose one of the following two options based on the university's network firewall policy.

### Option A: Cloudflare Tunnel (Recommended)
*Best for university campuses where inbound public ports (80/443) are blocked or restricted. Traffic routes through an encrypted outbound tunnel directly to Cloudflare.*

1. **Create Tunnel in Cloudflare Zero Trust**:
   - Navigate to **Cloudflare Zero Trust Dashboard** > **Networks** > **Tunnels**.
   - Click **Add a tunnel**, select **Cloudflare Tunnel**, and name it `seed-fund-portal`.
2. **Install `cloudflared` on University Server**:
   ```bash
   # Download and install cloudflared Debian package
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb

   # Install the tunnel service using token from dashboard
   sudo cloudflared service install [TUNNEL_TOKEN_FROM_DASHBOARD]
   sudo systemctl enable --now cloudflared
   ```
3. **Configure Public Hostname**:
   - In Cloudflare Dashboard, under the tunnel's **Public Hostname** tab:
     - Subdomain: `seedfund`
     - Domain: `[university-domain, e.g., itmuniversity.ac.in]`
     - Service Type: `HTTP`
     - URL: `localhost:3000`
   - Save the hostname. Cloudflare creates the proxied DNS CNAME automatically.

---

### Option B: Proxied DNS Record to Origin
*Use only if the university firewall allows inbound HTTPS traffic to the server.*

1. **DNS Record**:
   - In Cloudflare DNS, create an **A record**:
     - Name: `seedfund`
     - IPv4 Address: `[SERVER_PUBLIC_IP]`
     - Proxy status: **Proxied (Orange Cloud ON)**
2. **Nginx Reverse Proxy with Cloudflare Origin CA**:
   - Generate a free **Cloudflare Origin Certificate** in SSL/TLS > Origin Server.
   - Save to `/etc/ssl/certs/seedfund_cf_origin.pem` and private key to `/etc/ssl/private/seedfund_cf_origin.key`.
   - Install Nginx configuration in `/etc/nginx/sites-available/seedfund`:
     ```nginx
     server {
         listen 80;
         server_name seedfund.[university-domain];
         return 301 https://$host$request_uri;
     }

     server {
         listen 443 ssl http2;
         server_name seedfund.[university-domain];

         ssl_certificate /etc/ssl/certs/seedfund_cf_origin.pem;
         ssl_certificate_key /etc/ssl/private/seedfund_cf_origin.key;
         ssl_protocols TLSv1.2 TLSv1.3;
         ssl_ciphers HIGH:!aNULL:!MD5;

         client_max_body_size 10M;

         location / {
             proxy_pass http://127.0.0.1:3000;
             proxy_http_version 1.1;
             proxy_set_header Upgrade $http_upgrade;
             proxy_set_header Connection 'upgrade';
             proxy_set_header Host $host;
             proxy_cache_bypass $http_upgrade;

             # Cloudflare IP preservation
             proxy_set_header X-Real-IP $http_cf_connecting_ip;
             proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
             proxy_set_header X-Forwarded-Proto https;
         }
     }
     ```
   - Enable configuration: `sudo ln -s /etc/nginx/sites-available/seedfund /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl restart nginx`.
3. **Firewall Restriction**:
   - Restrict inbound ports 80/443 exclusively to [Cloudflare's published IP ranges](https://www.cloudflare.com/ips/).

---

### Recommended Cloudflare Edge Settings (Both Options)
1. **SSL/TLS Mode**: **Full (strict)**.
2. **Edge Certificates**:
   - Enable **Always Use HTTPS**.
   - Minimum TLS Version: **TLS 1.2**.
   - Enable **Opportunistic Encryption** and **Automatic HTTPS Rewrites**.
3. **Caching**:
   - Create a Cache Rule: **Bypass Cache** for `/api/*`, `/sec/*`, `/admin/*`, and `/dashboard/*`.
   - Prevent caching dynamic assessment data and confidential proposals.
4. **Security & WAF**:
   - Enable **Cloudflare Managed Rules** and **Bot Fight Mode**.
   - Create Rate Limiting Rule: Max 10 requests/minute on `/login`, `/register`, and `/sec/register`.
5. **Real Visitor IP**:
   - The application automatically reads `CF-Connecting-IP` in `src/lib/auth-actions.ts` for rate limiting and audit logging.

---

## 10. Security Hardening
- **Localhost-Only Database**: PostgreSQL binds strictly to `127.0.0.1` in `postgresql.conf` (`listen_addresses = 'localhost'`).
- **File Permissions**: The environment file `/etc/seedfund/seedfund.env` is mode `640` owned by `root:seedfund`.
- **Zero Committed Secrets**: Secrets and real credentials are never committed to version control.
- **Enforced Password Rotation**: Initial admin credentials require password change on first authentication.
- **SEC Account Quota & Role Verification**:
  - Committee signups start in `PENDING` status.
  - Server-side role checks reject unapproved evaluators.
- **Suppressed Fingerprinting**: Next.js header `X-Powered-By` is disabled in `next.config.mjs`. Production mode suppresses stack traces to clients.
- **Upload Isolation**: Stored in a dedicated upload directory outside web root with file-type and size validation (5MB max).

---

## 11. Backup and Recovery

### Daily Automated Database Backup
Create `/usr/local/bin/backup-seedfund.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/backups/seedfund"
DATE=$(date +%Y-%m-%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Dump database in compressed custom format
pg_dump -U seedfund_user -h localhost -Fc ideapad_seed_fund > "$BACKUP_DIR/seedfund_$DATE.dump"

# Retain backups for 14 days
find "$BACKUP_DIR" -type f -name "*.dump" -mtime +14 -delete

# Sync to off-server university storage [fill in: rsync or s3cmd]
# rsync -avz -e ssh "$BACKUP_DIR" erp-backup-server:/mnt/storage/seedfund/
```

Make executable and schedule in cron:
```bash
sudo chmod +x /usr/local/bin/backup-seedfund.sh
sudo crontab -e
# Run daily at 02:00 AM
0 2 * * * /usr/local/bin/backup-seedfund.sh >> /var/log/seedfund-backup.log 2>&1
```

### Disaster Recovery / Database Restore
```bash
# Terminate existing connections
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'ideapad_seed_fund';"

# Restore dump
pg_restore -U seedfund_user -h localhost -d ideapad_seed_fund --clean /backups/seedfund/[DUMP_FILE].dump
```

---

## 12. Monitoring and Logs
- **Automated Uptime Check**: Add `https://seedfund.[university-domain]/health` to university uptime monitor (e.g., Uptime Kuma / Nagios / Zabbix). Expected response: HTTP 200 `{"status":"ok"}`.
- **Application Logs**:
  ```bash
  # View live application output
  sudo journalctl -u seedfund -f -n 100

  # Check errors only
  sudo journalctl -u seedfund -p err
  ```
- **Database Logs**: `/var/log/postgresql/postgresql-*.log`.
- **Cloudflare Security Events**: Monitor Cloudflare dashboard > Security > Events for blocked attacks or rate limit violations.

---

## 13. Updating and Rollback Procedures

### Standard Update Workflow
```bash
cd /opt/seedfund

# 1. Take safety pre-update backup
sudo /usr/local/bin/backup-seedfund.sh

# 2. Pull approved release commits
sudo -u seedfund git fetch origin
sudo -u seedfund git checkout deploy/university-server
sudo -u seedfund git pull origin deploy/university-server

# 3. Update dependencies and database migrations
sudo -u seedfund npm ci
sudo -u seedfund npx prisma generate
sudo -u seedfund npx prisma migrate deploy

# 4. Build application bundle
sudo -u seedfund npm run build

# 5. Restart systemd service
sudo systemctl restart seedfund

# 6. Verify health
curl -s http://localhost:3000/health
```

### Rollback Procedure
If a production issue occurs after an update:
```bash
cd /opt/seedfund

# 1. Rollback code to previous git commit/tag
sudo -u seedfund git checkout [PREVIOUS_COMMIT_OR_TAG]
sudo -u seedfund npm ci
sudo -u seedfund npx prisma generate

# 2. Restore pre-update database dump if schema changes occurred
pg_restore -U seedfund_user -h localhost -d ideapad_seed_fund --clean /backups/seedfund/[PRE_UPDATE_DUMP].dump

# 3. Rebuild and restart
sudo -u seedfund npm run build
sudo systemctl restart seedfund
```

---

## 14. Troubleshooting

| Symptom | Probable Cause | Resolution |
|---|---|---|
| **Cloudflare Error 502 / 521** | Node app or `cloudflared` service stopped | Run `sudo systemctl status seedfund` and `sudo systemctl status cloudflared`. Check `journalctl -u seedfund -n 50`. |
| **Cloudflare Error 525 / 526** | Invalid Origin SSL certificate in Option B | Verify certificate validity in `/etc/ssl/certs/` and ensure Cloudflare SSL mode is set to Full (strict). |
| **Login Fails: "Invalid email or password" for Admin** | Database not seeded or email case mismatch | Run `sudo -u seedfund npx prisma db seed`. Ensure email entered matches `ADMIN_EMAIL` exactly (case-insensitive). |
| **SEC Member Cannot Access /sec: "Waiting for admin approval"** | Account registered but not yet approved | Log in as Administrator, navigate to **User Management** (`/admin/users`), locate applicant under **Pending SEC Evaluators**, and click **Approve**. |
| **"Environment variable not found: DATABASE_URL"** | Missing environment file link or bad permissions | Verify `/etc/seedfund/seedfund.env` exists, has mode `640`, and contains valid `DATABASE_URL`. |
| **Database Connection Refused** | PostgreSQL daemon inactive or port changed | Check `sudo systemctl status postgresql` and verify port 5432 in `/etc/postgresql/*/main/postgresql.conf`. |
| **Milestone Edit Conflict Error** | Two evaluators edited the same milestone item simultaneously | The portal uses optimistic locking. Ask the evaluator to refresh the application page to fetch latest values. |

---

## 15. Go-Live Verification Checklist
Before declaring the system live, the ERP Cell and developer must verify:

- [ ] **Infrastructure**: Server OS updated, firewall enabled, `seedfund` non-root service user active.
- [ ] **Database**: PostgreSQL user granted privileges only on `ideapad_seed_fund`, listening on localhost only.
- [ ] **Secrets**: `/etc/seedfund/seedfund.env` configured with 48+ character `JWT_SECRET`, secure DB password, and mode `640`.
- [ ] **Migrations & Seed**: `prisma migrate deploy` executed successfully; initial admin account seeded.
- [ ] **First Login**: Admin logged in at `/login`, forced password change completed, and updated password securely recorded.
- [ ] **Cloudflare Configuration**: Tunnel or Proxied A-record active, SSL set to Full (strict), Always Use HTTPS enabled, WAF active.
- [ ] **Startup Flow Tested**: Registered test startup at `/register`, submitted multi-step Form A application with documents, verified status dashboard.
- [ ] **SEC Flow Tested**:
  - Registered test SEC evaluator at `/sec/register`.
  - Confirmed login is blocked with *"Your account is waiting for admin approval"*.
  - Logged into Admin panel (`/admin/users`), approved the SEC evaluator.
  - Confirmed SEC evaluator can now log in, view applications, edit milestones, and submit Form A review.
- [ ] **Admin Flow Tested**: Form B preview rendered, grant sanctioned, and report generated.
- [ ] **Role Boundary Enforcement**: Startup user attempting to browse `/sec` or `/admin` is redirected.
- [ ] **Backups**: `/usr/local/bin/backup-seedfund.sh` verified with a test restore into `seedfund_test_restore`.
- [ ] **Monitoring**: Health check `https://seedfund.[university-domain]/health` returning HTTP 200 and added to monitoring dashboard.

---

## 16. Contacts and Handover

| Role | Name | Organization / Department | Contact Details |
|---|---|---|---|
| **Lead Developer** | Kartik | B.Tech IT, ITM Gwalior | `[fill in: Email & Phone]` |
| **ERP Cell Technical Lead** | `[fill in: Name]` | ERP Cell, ITM University | `[fill in: Email & Phone]` |
| **Incubation Coordinator** | `[fill in: Name]` | IDEAPAD, ITM Universe | `[fill in: Email & Phone]` |
| **Cloudflare Account Admin** | `[fill in: Name]` | ERP Network Infrastructure | `[fill in: Email & Phone]` |
| **Git Repository** | `SEED_FUND` | GitHub (`Kartik-T29/SEED_FUND`) | Branch: `deploy/university-server` |

---
*End of Deployment Guide. Signed on behalf of project handover.*  
**Kartik (B.Tech IT, ITM Gwalior)** — October 2026
