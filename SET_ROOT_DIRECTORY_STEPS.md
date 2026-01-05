# Step-by-Step: Set Root Directory in Vercel

## 🎯 Goal
Configure Vercel to build from `ux-audit-agent/` subdirectory instead of repository root.

## 📋 Detailed Steps

### Step 1: Open Vercel Dashboard
1. The browser should open automatically (or go to: https://vercel.com/dashboard)
2. Sign in if prompted

### Step 2: Select Your Project
1. Look for the project named: **`ux-audit-agent`**
2. Click on it to open the project dashboard

### Step 3: Navigate to Settings
1. At the top of the page, you'll see tabs: **Overview**, **Deployments**, **Analytics**, **Settings**
2. Click on **"Settings"** tab

### Step 4: Find Root Directory Setting
1. In the left sidebar, you'll see:
   - General
   - Environment Variables
   - Git
   - Domains
   - etc.
2. Click on **"General"** (should be the first option)

### Step 5: Edit Root Directory
1. Scroll down the page until you see **"Root Directory"** section
2. You'll see:
   ```
   Root Directory
   [Edit] button
   ```
3. Click the **"Edit"** button

### Step 6: Enter Root Directory Path
1. A text input field will appear
2. **Clear any existing value** (if there is one)
3. Type exactly: `ux-audit-agent`
   - No leading slash `/`
   - No trailing slash `/`
   - Just: `ux-audit-agent`
4. Click **"Save"** button

### Step 7: Verify the Change
1. You should see the Root Directory now shows: `ux-audit-agent`
2. The change is saved automatically

### Step 8: Redeploy
1. Click on **"Deployments"** tab (top navigation)
2. Find the latest deployment (should show "Error" status)
3. Click the **"..."** (three dots) menu on the right
4. Click **"Redeploy"**
5. Confirm by clicking **"Redeploy"** again

### Step 9: Wait for Build
1. You'll see the deployment status change to "Building..."
2. Wait 1-2 minutes for the build to complete
3. Status should change to **"Ready"** (green checkmark)

## ✅ Verification

After redeploying, check:

1. **Deployment Status**
   - Should show: `● Ready` (green)
   - Should NOT show: `● Error` (red)

2. **Build Logs**
   - Click on the deployment
   - Click "View Build Logs"
   - Should see: `✓ Compiled successfully`
   - Should NOT see: `Couldn't find any 'pages' or 'app' directory`

3. **Test Your App**
   - Visit your deployment URL
   - Try running an audit
   - Should work correctly

## 🆘 Troubleshooting

### If "Root Directory" option is not visible:
- Make sure you're in **Settings → General** (not other settings tabs)
- Scroll down - it might be further down the page
- Try refreshing the page

### If the field doesn't save:
- Make sure you typed exactly: `ux-audit-agent` (no slashes)
- Try clicking "Save" again
- Refresh the page and check if it persisted

### If deployment still fails:
- Make sure you clicked "Redeploy" after saving
- Check the build logs for new error messages
- Verify the root directory is set correctly in Settings

## 📸 Visual Guide

**Settings → General Page Layout:**
```
┌─────────────────────────────────────┐
│  Project Settings                   │
├─────────────────────────────────────┤
│  [General] ← Click this            │
│  Environment Variables               │
│  Git                                 │
│  ...                                 │
├─────────────────────────────────────┤
│  Root Directory                     │
│  [Edit] ← Click this                │
│  ┌─────────────────────────────┐   │
│  │ ux-audit-agent             │ ← Type this
│  └─────────────────────────────┘   │
│  [Save] ← Click this                │
└─────────────────────────────────────┘
```

## 🎉 Success Indicators

You'll know it worked when:
- ✅ Root Directory shows: `ux-audit-agent`
- ✅ Deployment status: `● Ready`
- ✅ Build logs show successful compilation
- ✅ Your app loads and works correctly

---

**Time Required:** 2-3 minutes  
**Difficulty:** Easy  
**Need Help?** If you get stuck at any step, let me know!





