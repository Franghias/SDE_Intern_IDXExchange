# Securely Connecting and Uploading Local SQL Files to Railway MySQL

This guide outlines the most secure method to connect a local PC to a hosted Railway MySQL instance using the official Railway CLI over an encrypted SSH tunnel. This keeps your database 100% private without exposing it to the public internet.

---

## 🛠️ Part 1: First-Time Setup Only

Perform these steps once to configure your Windows environment, install the tools, and link your secure keys.

### Step 1: Fix Windows Environment Variables
Railway requires the standard MySQL Client (`mysql.exe`), not just the MySQL Shell (`mysqlsh.exe`). 
1. Press the **Windows Key**, type `Environment Variables`, and select **Edit the system environment variables**.
2. Click **Environment Variables...** at the bottom.
3. Under *System variables*, select **Path** and click **Edit...**.
4. Click **New** and add the path to your server's installation directory (adjust if your version differs):
   ```text
   C:\Program Files\MySQL\MySQL Server 8.0\bin
   ```
5. Click **OK** to close all windows.
6. **Crucial:** Restart your IDE (VS Code, Cursor, etc.) completely so it registers the new terminal paths.

### Step 2: Install and Authenticate the Railway CLI
1. Open your IDE's terminal (**PowerShell**).
2. Install the CLI using PowerShell:
   ```powershell
   iwr -useb https://railway.sh | iex
   ```
3. Authenticate your account:
   ```powershell
   railway login
   ```
   *This will open a secure browser window to sign you in.*

### Step 3: Link Your Local Folder to Railway
Navigate to your local project directory in the terminal and tie it to your online Railway environment:
```powershell
railway link
```
*Select your specific project from the interactive list using your arrow keys.*

### Step 4: Generate and Add a Secure SSH Key
Railway uses SSH keys to verify your machine over a private network connection.
1. Generate an modern, secure SSH key pair:
   ```powershell
   ssh-keygen -t ed25519
   ```
   *Press **Enter** to accept the default file paths and leave the passphrase blank.*
2. Upload and register this key directly to your Railway account:
   ```powershell
   railway ssh keys add
   ```

---

## 🚀 Part 2: Everyday Access & Upload Workflow

Once the first-time setup is complete, use this streamlined workflow anytime you need to sync or update your database schema.

### Step 1: Ensure Local MySQL is Running
If you regularly deactivate MySQL in Task Manager during development, make sure the background engine is active before uploading:
1. Open **Task Manager** (`Ctrl + Shift + Esc`).
2. Go to the **Services** tab.
3. Locate **MySQL80** (or your active engine version), right-click it, and select **Start**.

### Step 2: Upload Your Local `.sql` File
Because Windows PowerShell treats the traditional `<` operator as a reserved operator, you must pipe your file data using `Get-Content`. 

Run the following command to securely tunnel and upload your database file:
```powershell
Get-Content database/01_rets_openhouse.sql | railway connect
```

### What to Expect:
1. The CLI will prompt you: `> Select service MySQL`. Hit **Enter**.
2. It will display a validation success line:
   ```text
   Using SSH key from file C:\Users\User\.ssh\id_ed25519.pub...
   Opening SSH tunnel: 127.0.0.1:XXXXX → service :3306 ...
   ```
3. The terminal cursor will blink silently. **Do not close the window.** It is actively streaming the data.
4. Once the upload finishes, your normal command line prompt (`PS C:\...>`) will return, indicating a successful transfer.

---

## ⚠️ Troubleshooting: `ERROR 1067 (42000): Invalid default value for 'active_check'`

- **Why it happens:** Legacy MariaDB SQL dumps (`rets_property.sql`) contain columns (such as `active_check`) with default values `'0000-00-00 00:00:00'`. Strict MySQL 8 on Railway rejects altering tables or adding indexes when strict `NO_ZERO_DATE` mode is enabled.
- **Fix:** `database/03_add_indexes.sql` includes `SET SESSION sql_mode = 'NO_AUTO_VALUE_ON_ZERO';` at the top, allowing index creation to complete cleanly without schema default errors.

