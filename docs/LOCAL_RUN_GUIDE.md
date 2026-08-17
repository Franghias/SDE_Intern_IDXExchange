# Local Environment & Production Testing Guide

This guide explains how to run IDXExchange locally in **Development Mode** vs. **Production Mode**, how to verify production behavior locally, and how request log sanitization works.

---

## 1. Development Mode vs. Production Mode Overview

| Environment | Purpose | Backend Command | Frontend Command | Key Behaviors |
|---|---|---|---|---|
| **Development Mode** | Active development & debugging | `npm run dev`<br>*(uses `nodemon` auto-reload)* | `npm run dev`<br>*(uses `vite` dev server with HMR)* | • Unminified code & instant HMR<br>• React ErrorBoundary shows raw stack traces<br>• `import.meta.env.PROD = false` |
| **Production Mode** | Pre-deployment verification | `$env:NODE_ENV="production"; npm start`<br>*(uses standard `node`)* | `npm run build` then `npm run preview`<br>*(serves minified bundle)* | • Minified static asset bundle<br>• Stack traces hidden in ErrorBoundary<br>• `import.meta.env.PROD = true`<br>• Production log output |

---

## 2. How to Run Locally

### A. Development Mode Flow

1. **Database:**
   ```bash
   # Workspace Root
   docker compose up
   ```
2. **Backend (Terminal 1):**
   ```bash
   cd backend
   npm run dev
   ```
3. **Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm run dev
   ```
   *Access frontend at `http://localhost:3000`*

---

### B. Production Mode Flow

1. **Database:**
   ```bash
   # Workspace Root
   docker compose up
   ```
2. **Backend (Terminal 1):**
   - **PowerShell (Windows default):**
     ```powershell
     cd backend
     $env:NODE_ENV="production"; npm start
     ```
   - **CMD (Windows):**
     ```cmd
     cd backend
     set NODE_ENV=production && npm start
     ```
   - **Git Bash / Linux / macOS:**
     ```bash
     cd backend
     NODE_ENV=production npm start
     ```
3. **Frontend (Terminal 2):**
   ```bash
   cd frontend
   npm run build
   npm run preview
   ```
   *Access frontend production preview at `http://localhost:4173`*

---

## 3. Step-by-Step Verification for Production

To confirm that your application is hardened and operating correctly in production mode before deploying to the cloud, run these 3 verification tests:

### Test 1: Verify Stack Trace Masking in ErrorBoundary
1. Open the production preview URL (`http://localhost:4173`).
2. If a UI component encounters an unhandled error, observe the error card.
3. **Expected Behavior:** The user sees a friendly *"Something went wrong"* error message. The *"Show technical details"* toggle and raw JavaScript stack traces (`error.stack`) are **hidden** because `import.meta.env.PROD` is `true`.

### Test 2: Verify API Error Sanitization
1. Stop the database container temporarily (`docker compose stop`).
2. Make a request to the health endpoint: `GET http://localhost:5000/api/health`.
3. **Expected Behavior:** The response payload returns generic `{"status":"error","message":"Database connection unavailable"}`. Raw MySQL driver error strings (`ECONNREFUSED`), internal port numbers, or hostnames are **not** exposed in the HTTP response.
4. Restart the database (`docker compose up -d`).

### Test 3: Verify Request Log Sanitization
1. Send a request containing a sensitive query parameter, for example:
   `http://localhost:5000/api/properties?token=test123%20secret`
2. Check the backend server terminal output.
3. **Expected Behavior:** The log line shows:
   `[2026-08-17T19:33:48.638Z] GET /api/properties?token=[REDACTED] 200 10568ms`

---

## 4. Explaining Log Sanitization & `token=[REDACTED]`

### Why did `http://localhost:5000/api/properties?token=test123%20secret` return data like usual?

1. **Express Query Handling:** `GET /api/properties` parses query parameters to apply filters (such as `city`, `minPrice`, `beds`, `sortBy`). Unrecognized query parameters like `token` are safely ignored by the property filter validation logic. Therefore, the query executes normally and returns 200 OK with listing results as expected.
2. **Log Redaction Pipeline:** Before response output is flushed, `requestLogger` processes the request URL through `redactUrl()` in `backend/src/utils/logger.js`.
3. **Security Safeguard:** Because `token` matches sensitive parameter patterns (`key`, `token`, `secret`, `password`, `auth`, `authorization`, `email`, etc.), `redactUrl()` replaces `test123 secret` with `[REDACTED]` before writing the log line to stdout.

> **Why this matters for Cloud Deployment:** Even if a user, client app, or third party accidentally passes sensitive tokens, session IDs, or API keys in request URLs, your cloud log streams (e.g., AWS CloudWatch, GCP Cloud Logging, Datadog) will **never leak or store raw secret values**.
