# Fix Vercel Build Error - Root Directory Issue

## 🔴 Current Error

```
Error: > Couldn't find any `pages` or `app` directory. Please create one under the project root
```

## 🔍 Root Cause

Vercel is building from the repository root (`CaseStudy/`), but your Next.js app is in the `ux-audit-agent/` subdirectory.

**Repository Structure:**
```
CaseStudy/                    ← Vercel is building from here
├── ux-audit-agent/           ← But your app is here!
│   ├── app/
│   ├── package.json
│   └── vercel.json
└── ...
```

## ✅ Solution: Configure Root Directory in Vercel

### Method 1: Via Vercel Dashboard (Recommended - 2 minutes)

1. **Open Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Sign in if needed

2. **Select Your Project**
   - Click on: **`ux-audit-agent`** project

3. **Go to Settings**
   - Click **"Settings"** tab (top navigation)
   - Click **"General"** in the left sidebar

4. **Configure Root Directory**
   - Scroll down to **"Root Directory"** section
   - Click **"Edit"** button
   - Enter: `ux-audit-agent`
   - Click **"Save"**

5. **Redeploy**
   - Go to **"Deployments"** tab
   - Click **"..."** (three dots) on the latest deployment
   - Click **"Redeploy"**
   - Or push a new commit to trigger automatic deployment

### Method 2: Re-import Project (Alternative)

If Method 1 doesn't work:

1. **Delete Current Project** (optional - only if needed)
   - Vercel Dashboard → Project → Settings → Delete Project

2. **Re-import with Correct Settings**
   - Go to: https://vercel.com/new
   - Import: `JincyThazheNamath/Automated_UX_Fix`
   - **IMPORTANT:** In the import settings:
     - **Root Directory:** Set to `ux-audit-agent`
     - **Framework Preset:** Next.js (auto-detected)
   - Click **"Deploy"**

## 📋 Verification Steps

After fixing:

1. **Check Deployment Status**
   ```bash
   cd ux-audit-agent
   vercel ls
   ```
   - Should show: `● Ready` (not `● Error`)

2. **Visit Your App**
   - Production URL: https://ux-audit-agent-jincythazhenamaths-projects.vercel.app
   - Or: https://automated-ux-fix.vercel.app (if that's your main project)

3. **Test the App**
   - Enter a test URL (e.g., `example.com`)
   - Run an audit
   - Verify it works

4. **Check Build Logs**
   - Vercel Dashboard → Deployments → Latest → View Build Logs
   - Should see: `✓ Compiled successfully`
   - Should NOT see: `Couldn't find any 'pages' or 'app' directory`

## 🎯 Quick Fix Checklist

- [ ] Open Vercel Dashboard
- [ ] Go to `ux-audit-agent` project → Settings → General
- [ ] Set Root Directory to: `ux-audit-agent`
- [ ] Save changes
- [ ] Redeploy (or push new commit)
- [ ] Verify deployment shows `● Ready`
- [ ] Test the deployed app

## 💡 Why This Happened

When you import a GitHub repository to Vercel, it defaults to building from the repository root. If your Next.js app is in a subdirectory, you need to explicitly tell Vercel where to find it.

## 🚀 After Fix

Once the root directory is configured:
- ✅ Future deployments will automatically build from the correct directory
- ✅ No need to reconfigure for each deployment
- ✅ Your app will deploy successfully

---

**Estimated Time:** 2-3 minutes  
**Difficulty:** Easy  
**Status:** Ready to fix





