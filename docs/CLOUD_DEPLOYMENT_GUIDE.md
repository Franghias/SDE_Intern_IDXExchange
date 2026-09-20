# Cloud Deployment Guide — Render + Aiven / Railway + Vercel

This guide provides step-by-step instructions for deploying the **IDXExchange** application to your target cloud stack:
- **Database:** **Aiven for MySQL** (Recommended Free Tier) or **Railway** (Managed MySQL)
- **Backend:** Render (Express API Web Service)
- **Frontend:** Vercel (React Single-Page Application)

---

## 1. Database Setup & Migration

Since the SQL dumps in `database/` (`01_rets_openhouse.sql`, `02_rets_property.sql`, `03_add_indexes.sql`) are ignored by Git (`.gitignore`), you must import them into your cloud MySQL database instance.

> [!NOTE]
> The database dump files in `database/` are part of the local workspace data and are not checked into public Git repositories. Anyone deploying the project must have their own local copy of these files to run the initial migration.

Choose your cloud database provider below:

---

### Option A: Aiven for MySQL (Current / Recommended)

Aiven offers a managed cloud MySQL service with built-in SSL security.

#### Step 1: Activate Aiven MySQL Service
1. Sign up or log in at [Aiven.io](https://aiven.io).
2. Click **Create Service**.
3. Select **MySQL** as the service type.
4. Choose the Cloud Provider (e.g., AWS, GCP) and region closest to your backend (or free plan if available).
5. Name your service (e.g., `idxexchange-mysql`) and click **Create Service**.
6. Wait for the service status to change from *Rebuilding* to **Running**.
7. In the **Overview** tab, note down your connection parameters:
   - **Host** (`<HOST>`)
   - **Port** (`<PORT>`)
   - **User** (`<USER>`, typically `avnadmin`)
   - **Password** (`<PASSWORD>`)
   - **Database Name** (default is `defaultdb`)
   - **Service URI** (`mysql://avnadmin:<password>@<host>:<port>/defaultdb?ssl-mode=REQUIRED`)

#### Step 2: Connect to MySQL via Command Line
Open your terminal / PowerShell and connect using the MySQL CLI with SSL enabled:

```bash
mysql -h <HOST> -P <PORT> -u <USER> -p --ssl-mode=REQUIRED
```
*(Enter your Aiven password when prompted).*

#### Step 3: Import the Source Database Files
Once connected to the interactive `mysql>` prompt, select the database (e.g. `defaultdb`) and run the `SOURCE` commands in order:

```sql
USE defaultdb;

-- 1. Import Open Houses schema & data (~8.7 MB)
SOURCE C:/Users/User/Downloads/IDXExchange - SDE Intern/database/01_rets_openhouse.sql;

-- 2. Import Property schema & data (~632 MB - may take a few minutes)
SOURCE C:/Users/User/Downloads/IDXExchange - SDE Intern/database/02_rets_property.sql;

-- 3. Add Performance Indexes (~2 KB)
SOURCE C:/Users/User/Downloads/IDXExchange - SDE Intern/database/03_add_indexes.sql;
```
*(Note: Forward slashes `/` work in the `SOURCE` path across all operating systems in the MySQL CLI).*

---

### Option B: Railway Managed MySQL (Alternative)

If you prefer using Railway for your managed MySQL database:

The recommended and most secure method is using the **Railway CLI over an encrypted SSH tunnel** (as detailed in [`docs/Railway_MySQL_CONNECTION_GUIDE.md`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/docs/Railway_MySQL_CONNECTION_GUIDE.md)).

#### Prerequisites & CLI Link (First-Time Only):
1. Install Railway CLI in PowerShell: `iwr -useb https://railway.sh | iex`
2. Authenticate: `railway login`
3. Link project folder: `railway link` (select your Railway project)
4. Add SSH Key: `ssh-keygen -t ed25519` then `railway ssh keys add`

#### Upload SQL Files via Railway CLI (PowerShell):
In Windows PowerShell, traditional `<` redirection is reserved. Pipe your `.sql` files securely using `Get-Content`:

```powershell
# 1. Import Open Houses schema & data (~8.7 MB)
Get-Content database/01_rets_openhouse.sql | railway connect

# 2. Import Property schema & data (~632 MB - stream takes a few minutes)
Get-Content database/02_rets_property.sql | railway connect

# 3. Add Performance Indexes (~2 KB)
Get-Content database/03_add_indexes.sql | railway connect
```
*(When prompted by the CLI, select `MySQL` using your arrow keys).*

#### Alternative: Direct Public Connection (`mysql` CLI or GUI Client)
If you enabled public networking on your Railway MySQL service:
```bash
mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < database/01_rets_openhouse.sql
mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < database/02_rets_property.sql
mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < database/03_add_indexes.sql
```
*(Or connect via a GUI client like TablePlus, DBeaver, or MySQL Workbench).*

---

## 2. Backend Deployment: Render Web Service

1. Log in to [Render.com](https://render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository.
4. Configure the service settings:
   - **Name:** `idxexchange-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Scroll down to **Environment Variables** and add:

   | Key | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production mode |
   | `DATABASE_URL` or `MYSQL_URL` | `<Service URI>` | **For Aiven:** `mysql://avnadmin:pass@host:port/defaultdb?ssl-mode=REQUIRED`<br>**For Railway:** `mysql://root:pass@domain:port/railway` |
   | `DB_HOST` (or `MYSQLHOST`) | `<Host>` | MySQL Host from Aiven or Railway |
   | `DB_PORT` (or `MYSQLPORT`) | `<Port>` | MySQL Port (e.g., Aiven port or `3306`) |
   | `DB_USER` (or `MYSQLUSER`) | `<User>` | `avnadmin` (Aiven) or `root` (Railway) |
   | `DB_PASSWORD` (or `MYSQLPASSWORD`) | `<Password>` | MySQL Password |
   | `DB_NAME` (or `MYSQLDATABASE`) | `<Database Name>` | `defaultdb` (Aiven) or `railway` (Railway) |
   | `LLM_API_KEY` | `<Your OpenRouter API Key>` | Secret key for AI Assistant |
   | `LLM_MODEL` | `cohere/north-mini-code:free` | Selected LLM Model |
   | `ALLOWED_ORIGINS` | `https://propertysearchsdeintern.vercel.app,https://propertysearchsdeintern-hsujzxyf0-franghias-projects.vercel.app` | Comma-separated CORS allowed origins |

   *(Note: `backend/src/app.js` enforces secure origin whitelisting for your Vercel production domain, preview branches, and local dev, while rejecting unauthorized third-party cross-origin requests).*
   *(Note: `backend/src/config/db.js` automatically prioritizes `MYSQL_URL` / `MYSQL_PUBLIC_URL` / `DATABASE_URL` / `DB_URL` if present, then checks standard variables `MYSQLHOST`/`MYSQLUSER`/etc., and falls back to `DB_HOST`/`DB_USER`/etc. for local dev).*
6. Click **Create Web Service**.
7. Once deployed, copy your Render backend URL (e.g., `https://sde-intern-idxexchange.onrender.com`).

---

## 3. Frontend Deployment: Vercel

1. Ensure [`frontend/vercel.json`](file:///c:/Users/User/Downloads/IDXExchange%20-%20SDE%20Intern/frontend/vercel.json) has your Render backend URL in the rewrite rule:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://idxexchange-backend.onrender.com/api/:path*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
2. Push your changes to GitHub.
3. Log in to [Vercel.com](https://vercel.com).
4. Click **Add New...** $\rightarrow$ **Project** and import your GitHub repository.
5. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Edit $\rightarrow$ select `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Under **Environment Variables**, add:
   - `VITE_GOOGLE_MAPS_API_KEY` = `<Your Google Maps API Key>`
7. Click **Deploy**.

---

## 4. Architecture Summary

```
[User Browser]
      │
      ▼
[Vercel Frontend] (https://idxexchange.vercel.app)
      │
      │ /api/* (Proxied via vercel.json)
      ▼
[Render Backend] (https://idxexchange-backend.onrender.com)
      │
      │ SQL Queries (mysql2/promise connection pool with SSL)
      ▼
[Aiven / Railway Database] (Managed MySQL in Cloud)
```

