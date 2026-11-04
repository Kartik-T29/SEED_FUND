# AWS EC2 Production Deployment Guide

**System**: IDEAPAD Seed Grant Portal  
**Platform**: AWS EC2 M7i-flex.large (2 vCPU, 8 GB RAM), Amazon Linux 2023, gp3 EBS  
**Domain**: `https://seedfundip.duckdns.org`  
**Process Model**: Nginx (TLS / Reverse Proxy) $\rightarrow$ PM2 (Single Fork Next.js) $\rightarrow$ PostgreSQL 16 (Localhost)  

---

## 1. Architecture Topology & Security Boundaries

```mermaid
flowchart TD
    Client["Browser / Client (HTTPS)"]
    DuckDNS["DuckDNS (seedfundip.duckdns.org)"]
    Nginx["Nginx Reverse Proxy (:443 / :80)<br/>TLS Let's Encrypt | 10MB Upload Limit"]
    NextJS["Next.js Server (:3000)<br/>Managed by PM2 (Single Fork)"]
    LocalPG["PostgreSQL 16 (:5432)<br/>seedfund db (SCRAM-SHA-256)"]
    UploadsDir["/var/lib/seedfund/uploads<br/>(Private, chmod 700)"]
    EnvSecrets["/etc/seedfund/seedfund.env<br/>(Private, chmod 600)"]
    S3RDS["[Future Migration Target]<br/>AWS RDS & Amazon S3"]

    Client -->|HTTPS / 443| DuckDNS
    DuckDNS --> Nginx
    Nginx -->|Proxy HTTP / 127.0.0.1:3000| NextJS
    NextJS -->|Localhost TCP / 127.0.0.1:5432| LocalPG
    NextJS -->|Filesystem StorageAdapter| UploadsDir
    NextJS -.->|Loads secrets on boot| EnvSecrets
    NextJS -.->|Zero-code config switch| S3RDS
```

### Key Security & Isolation Principles:
1. **No External DB / App Port Exposure**: PostgreSQL (`5432`) and Next.js (`3000`) listen **strictly** on `127.0.0.1`. Only ports `80` and `443` are exposed in the AWS EC2 Security Group.
2. **Secrets Out of Web Root**: All production secrets reside in `/etc/seedfund/seedfund.env` (permissions `0600` owned by `ec2-user`), preventing accidental exposure via web server directories or git commits.
3. **Private Document Storage**: Uploaded pitch decks, utilization reports, and annexure quotations are stored in `/var/lib/seedfund/uploads` outside the web root. Files are renamed to random UUIDs and served exclusively through authenticated Next.js API endpoints (`/api/documents/[id]`) with role-based access control.
4. **Hibernation & gp3 Storage**: The EC2 instance utilizes an encrypted gp3 EBS volume. Hibernation is enabled, ensuring state preservation during planned cost-saving maintenance windows.

---

## 2. Server Environment & Packages Setup

Run the following commands on a clean Amazon Linux 2023 instance:

### Step 1: Operating System & Essential Packages
```bash
sudo dnf update -y
sudo dnf install -y git nginx postgresql16-server postgresql16 jq certbot python3-certbot-nginx
```

### Step 2: Node.js 20 LTS or 22 Installation
```bash
# Install Node.js 20 or 22 via dnf or nodesource
sudo dnf module enable -y nodejs:20
sudo dnf install -y nodejs
sudo npm install -g pm2
```

### Step 3: Initialize & Start PostgreSQL 16
```bash
# Initialize DB cluster
sudo postgresql-setup --initdb

# Enable and start service
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Configure SCRAM-SHA-256 in /var/lib/pgsql/data/pg_hba.conf
# Ensure host 127.0.0.1/32 and ::1/128 use scram-sha-256:
sudo sed -i 's/host    all             all             127.0.0.1\/32            ident/host    all             all             127.0.0.1\/32            scram-sha-256/' /var/lib/pgsql/data/pg_hba.conf
sudo sed -i 's/host    all             all             ::1\/128                 ident/host    all             all             ::1\/128                 scram-sha-256/' /var/lib/pgsql/data/pg_hba.conf
sudo systemctl reload postgresql

# Create database and user
sudo -u postgres psql -c "CREATE USER seedfund WITH ENCRYPTED PASSWORD 'YOUR_STRONG_DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE seedfund OWNER seedfund;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE seedfund TO seedfund;"
```

### Step 4: Provision Directories and Permissions
```bash
# Create directory for production secrets
sudo mkdir -p /etc/seedfund
sudo chown -R ec2-user:ec2-user /etc/seedfund
chmod 700 /etc/seedfund

# Create upload directory outside web root
sudo mkdir -p /var/lib/seedfund/uploads
sudo chown -R ec2-user:ec2-user /var/lib/seedfund/uploads
chmod 700 /var/lib/seedfund/uploads
```

---

## 3. Environment Variables Configuration

Create `/etc/seedfund/seedfund.env`:

```bash
sudo cat << 'EOF' > /etc/seedfund/seedfund.env
# ==============================================================================
# IDEAPAD Seed Fund Portal - Production Configuration
# /etc/seedfund/seedfund.env (chmod 600 ec2-user:ec2-user)
# ==============================================================================

# Database Connection (PostgreSQL 16 on localhost)
DATABASE_URL="postgresql://seedfund:YOUR_STRONG_DB_PASSWORD@127.0.0.1:5432/seedfund?schema=public&connection_limit=10"

# Public Access & Security
PUBLIC_SITE_URL="https://seedfundip.duckdns.org"
COOKIE_SECURE="true"
NODE_ENV="production"
PORT=3000

# Document Storage (Local disk storage outside web root)
STORAGE_PROVIDER="local_disk"
UPLOAD_DIR="/var/lib/seedfund/uploads"

# Future S3 Configuration (Ready for activation without code change)
# STORAGE_PROVIDER="s3"
# S3_BUCKET_NAME="ideapad-seedfund-production-docs"
# AWS_REGION="ap-south-1"

# Initial Administration & SEC Member Profiles (For seeding fresh installations)
ADMIN_EMAIL="incubator.director@itmuniversity.ac.in"
ADMIN_PASSWORD="REPLACE_WITH_VERY_STRONG_ADMIN_PASSWORD"
SEC_MEMBER_1_EMAIL="sec.tech@itmuniversity.ac.in"
SEC_MEMBER_2_EMAIL="sec.finance@itmuniversity.ac.in"
SEC_MEMBER_3_EMAIL="sec.market@itmuniversity.ac.in"
EOF

sudo chmod 600 /etc/seedfund/seedfund.env
sudo chown ec2-user:ec2-user /etc/seedfund/seedfund.env
```

---

## 4. Nginx Reverse Proxy Configuration

Create `/etc/nginx/conf.d/seedfund.conf`:

```nginx
# Rate limiting zone for authentication endpoints
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;

server {
    listen 80;
    listen [::]:80;
    server_name seedfundip.duckdns.org;

    # Certbot challenge location
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name seedfundip.duckdns.org;

    # SSL Certificates managed by Let's Encrypt / Certbot
    ssl_certificate /etc/letsencrypt/live/seedfundip.duckdns.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seedfundip.duckdns.org/privkey.pem;

    # Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Maximum file upload size (Pitch deck, utilization report, quotations)
    client_max_body_size 10M;

    # Static assets cache optimization
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Brand assets & public files
    location /brand/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=86400";
    }

    # Health check endpoint (Direct proxy, no rate limit)
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Main Application Proxy
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Proxy headers for IP and scheme preservation
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for document generation and heavy requests
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

Test and enable Nginx:
```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

---

## 5. PM2 Process Management

The application is configured using `ecosystem.config.js`. It runs Next.js in a single fork process (`instances: 1`), honoring the M7i-flex.large 2-vCPU resource profile while preventing multiple instances from competing for memory or disk file locks.

### Starting the Process
```bash
cd /home/ec2-user/SEED_FUND

# Start application via PM2
pm2 start ecosystem.config.js

# Save process list for automatic reboot resurrection
pm2 save

# Setup systemd startup hook
pm2 startup systemd
```

### Process Control Commands
```bash
# Check status
pm2 status

# Realtime logs
pm2 logs seedfund

# Restart application (e.g. after deployment or env update)
pm2 restart seedfund --update-env

# Graceful reload
pm2 reload seedfund
```

---

## 6. Step-by-Step Deployment Routine

To deploy code updates cleanly:

```bash
#!/usr/bin/env bash
set -e

APP_DIR="/home/ec2-user/SEED_FUND"
cd "$APP_DIR"

echo "=== [1/5] Pulling latest code ==="
# git pull origin main (on production release branch)

echo "=== [2/5] Installing production dependencies ==="
npm ci --omit=dev

echo "=== [3/5] Applying database migrations ==="
npx prisma migrate deploy

echo "=== [4/5] Building Next.js application ==="
npm run build

echo "=== [5/5] Reloading PM2 process ==="
pm2 reload seedfund --update-env

echo "=== Verifying Health Check ==="
curl -s -f http://127.0.0.1:3000/health | jq .
echo "Deployment completed successfully!"
```

---

## 7. Storage Adapter & Migration to RDS / S3

The codebase is built with zero lock-in to local disk or single-instance PostgreSQL:

### Storage Architecture (`src/lib/storage.ts`)
- **Current Mode**: `STORAGE_PROVIDER="local_disk"`. Files are written to `/var/lib/seedfund/uploads/<uuid>.<ext>` using atomic stream writing with `0600` permissions.
- **Future S3 Mode**: Switching to AWS S3 requires **only** setting:
  ```bash
  STORAGE_PROVIDER="s3"
  S3_BUCKET_NAME="ideapad-seedfund-production-docs"
  AWS_REGION="ap-south-1"
  ```
  The instance's IAM EC2 role provides permissions `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject`. No Next.js code edits are required.

### Database Architecture (`prisma/schema.prisma` & `src/lib/prisma.ts`)
- Fully PostgreSQL native with connection pooling (`connection_limit=10`), lazy client initialization to prevent build-time hangs, and prepared statement optimization.
- Moving to AWS RDS PostgreSQL requires only updating `DATABASE_URL` in `/etc/seedfund/seedfund.env` and restarting PM2.

---

## 8. Backup & Maintenance Routines

Add a nightly backup cronjob (`/etc/cron.daily/seedfund-backup`):

```bash
sudo cat << 'EOF' > /etc/cron.daily/seedfund-backup
#!/bin/bash
BACKUP_DIR="/var/backups/seedfund"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

# Database backup
pg_dump -h 127.0.0.1 -U seedfund -Fc seedfund > "$BACKUP_DIR/db_$TIMESTAMP.dump"

# Uploads directory backup
tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" -C /var/lib/seedfund uploads

# Retain backups for 14 days
find "$BACKUP_DIR" -type f -mtime +14 -delete
EOF

sudo chmod +x /etc/cron.daily/seedfund-backup
```
