# Fixing "Error: spawn EPERM" - Next.js Dev Server Won't Start

## Problem
The Next.js development server fails to start with error:
```
Error: spawn EPERM
errno: -4048
code: 'EPERM'
syscall: 'spawn'
```

This is a **Windows permission issue** that prevents Next.js from spawning child processes.

## Root Causes
1. **OneDrive File Locking** (Most Common) - OneDrive sync locks files, preventing Node.js from accessing them
2. **Windows Defender/Antivirus** - Security software blocking Node.js processes
3. **File Permissions** - Insufficient permissions on project folder
4. **Node.js Installation** - Corrupted or improperly installed Node.js

## Solutions (Try in Order)

### Solution 1: Move Project Out of OneDrive ⭐ RECOMMENDED
OneDrive file locking is the #1 cause of this issue.

**Steps:**
1. Copy the project to a local folder (not in OneDrive):
   ```powershell
   # Create local projects folder
   New-Item -ItemType Directory -Path "C:\Projects" -Force
   
   # Copy project
   Copy-Item -Path "C:\Users\User\OneDrive\Desktop\UX-Audit\ai-ux-audit-agent-repo" -Destination "C:\Projects\UX-Audit" -Recurse
   
   # Navigate to new location
   cd "C:\Projects\UX-Audit\ai-ux-audit-agent-repo"
   
   # Install dependencies (if needed)
   npm install
   
   # Start server
   npm run dev
   ```

2. Access at: `http://localhost:3000`

### Solution 2: Run as Administrator
1. Right-click on PowerShell/Command Prompt
2. Select "Run as Administrator"
3. Navigate to project folder
4. Run `npm run dev`

### Solution 3: Add Windows Defender Exclusion
1. Open Windows Security (Windows Defender)
2. Go to **Virus & threat protection** → **Manage settings**
3. Scroll to **Exclusions** → Click **Add or remove exclusions**
4. Add these exclusions:
   - Folder: `C:\Users\User\OneDrive\Desktop\UX-Audit`
   - Folder: `C:\Program Files\nodejs`
   - Process: `node.exe`

### Solution 4: Pause OneDrive Sync Temporarily
1. Right-click OneDrive icon in system tray
2. Click **Settings** → **Account** tab
3. Click **Pause syncing** → Select **2 hours**
4. Try running `npm run dev` again
5. Resume syncing after testing

### Solution 5: Check Antivirus Settings
If you have third-party antivirus (Norton, McAfee, etc.):
1. Add project folder to antivirus exclusions
2. Add `node.exe` to allowed processes
3. Temporarily disable real-time protection to test

### Solution 6: Fix File Permissions
1. Right-click project folder → **Properties**
2. Go to **Security** tab
3. Click **Edit** → Select your user account
4. Check **Full control** → Click **OK**
5. Apply to all subfolders and files

### Solution 7: Reinstall Node.js
If nothing else works:
1. Uninstall Node.js from Control Panel
2. Download fresh installer from [nodejs.org](https://nodejs.org)
3. Install with "Add to PATH" option checked
4. Restart computer
5. Try again

## Quick Test Commands

Test if Node.js works:
```powershell
node --version
npm --version
```

Test if you can create files:
```powershell
cd "C:\Users\User\OneDrive\Desktop\UX-Audit\ai-ux-audit-agent-repo"
echo "test" > test.txt
Remove-Item test.txt
```

## Alternative: Use WSL (Windows Subsystem for Linux)
If Windows permissions continue to be problematic:
1. Install WSL: `wsl --install`
2. Open WSL terminal
3. Navigate to project (mounted at `/mnt/c/Users/User/OneDrive/Desktop/UX-Audit/ai-ux-audit-agent-repo`)
4. Run `npm run dev`

## Verification
After applying a solution, verify the server starts:
```powershell
cd "C:\Projects\UX-Audit\ai-ux-audit-agent-repo"  # or your project path
npm run dev
```

You should see:
```
▲ Next.js 14.2.35
- Local:        http://localhost:3000
```

## Most Likely Fix
**Move the project out of OneDrive** - This fixes the issue 90% of the time.

---

**Last Updated**: January 26, 2025
