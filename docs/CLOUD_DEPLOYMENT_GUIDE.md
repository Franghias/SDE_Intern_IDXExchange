# Cloud Deployment Guide — Render + Railway + Vercel

This guide provides step-by-step instructions for deploying the **IDXExchange** application to your target free-tier cloud stack:
- **Database:** Railway (Managed MySQL)
- **Backend:** Render (Express API Web Service)
- **Frontend:** Vercel (React Single-Page Application)

---

## 1. Database Migration: Local SQL to Railway MySQL

Since the SQL dumps in `database/` (`01_rets_openhouse.sql`, `02_rets_property.sql`, `03_add_indexes.sql`) are ignored by Git (`.gitignore`), you must import them directly into your Railway MySQL database instance.

### Step-by-Step:
1. Sign up/log in to [Railway.app](https://railway.app).
2. Click **+ New Project** $\rightarrow$ **Provision MySQL**.
3. Once created, click on the **MySQL service** $\rightarrow$ **Variables** / **Connect** tab to get your public connection credentials:
   - `MYSQLHOST` (e.g., `roundhouse.proxy.rlwy.net`)
   - `MYSQLPORT` (e.g., `3306` or mapped port `12345`)
   - `MYSQLUSER` (e.g., `root`)
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE` (e.g., `railway` or `rets`)
4. Open your local terminal in the project root directory and run the import commands using `mysql` CLI:
   ```bash
   # 1. Import Open Houses schema & data (~8.7 MB)
   mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < database/01_rets_openhouse.sql

   # 2. Import Property schema & data (~632 MB - takes 2-5 minutes)
   mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < database/02_rets_property.sql

   # 3. Add Performance Indexes
   mysql -h <MYSQLHOST> -P <MYSQLPORT> -u <MYSQLUSER> -p<MYSQLPASSWORD> <MYSQLDATABASE> < database/03_add_indexes.sql
   ```
   *(Alternative: You can use a GUI database client like TablePlus, DBeaver, or MySQL Workbench to connect to your Railway host and run these 3 `.sql` scripts).*

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
   | `DB_HOST` | `<Railway MYSQLHOST>` | Railway MySQL Host |
   | `DB_PORT` | `<Railway MYSQLPORT>` | Railway MySQL Port |
   | `DB_USER` | `<Railway MYSQLUSER>` | Railway MySQL User |
   | `DB_PASSWORD` | `<Railway MYSQLPASSWORD>` | Railway MySQL Password |
   | `DB_NAME` | `<Railway MYSQLDATABASE>` | Railway Database Name |
   | `LLM_API_KEY` | `<Your OpenRouter API Key>` | Secret key for AI Assistant |
   | `LLM_MODEL` | `cohere/north-mini-code:free` | Selected LLM Model |
6. Click **Create Web Service**.
7. Once deployed, copy your Render backend URL (e.g., `https://idxexchange-backend.onrender.com`).

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
      │ SQL Queries (mysql2/promise connection pool)
      ▼
[Railway Database] (MySQL on Railway Cloud)
```
