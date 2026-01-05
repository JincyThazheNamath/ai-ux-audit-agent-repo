# Professional CTO Guide: Set Root Directory in Vercel

## 🎯 Objective
Configure Vercel to build from `ux-audit-agent/` subdirectory instead of repository root.

## ⚡ Quick Fix (2 Minutes)

### Step 1: Access Settings
The browser should open to: `https://vercel.com/jincythazhenamaths-projects/ux-audit-agent/settings/general`

If not, navigate manually:
1. Go to: https://vercel.com/dashboard
2. Click project: **`ux-audit-agent`**
3. Click **"Settings"** tab
4. Click **"General"** (left sidebar)

### Step 2: Configure Root Directory
1. Scroll to **"Root Directory"** section
2. Click **"Edit"** button
3. In the input field, type: `ux-audit-agent`
4. Click **"Save"**

### Step 3: Verify
- Root Directory should now show: `ux-audit-agent`
- Status: Saved

### Step 4: Redeploy
1. Go to **"Deployments"** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**
4. Wait for build to complete

## ✅ Expected Result

**Before:**
```
Root Directory: (empty)
Build Error: Couldn't find any 'pages' or 'app' directory
```

**After:**
```
Root Directory: ux-audit-agent
Build Status: ● Ready
Build Logs: ✓ Compiled successfully
```

## 🔍 Verification Checklist

After setting root directory and redeploying:

- [ ] Root Directory shows: `ux-audit-agent` in Settings
- [ ] Latest deployment shows: `● Ready` (green)
- [ ] Build logs show: `✓ Compiled successfully`
- [ ] No error: `Couldn't find any 'pages' or 'app' directory`
- [ ] App is accessible at deployment URL
- [ ] Audit functionality works

## 📊 Technical Details

**Why This Is Needed:**
- Repository structure: `CaseStudy/ux-audit-agent/`
- Vercel defaults to building from repository root
- Next.js app is in subdirectory, not root
- Root directory setting tells Vercel where to find the app

**Impact:**
- Builds will succeed
- All dependencies will resolve correctly
- SWC dependencies will be found
- Deployment will complete successfully

## 🚀 Post-Fix Actions

Once root directory is set:
1. All future deployments will use correct directory
2. No need to reconfigure
3. CI/CD will work automatically
4. Production app will be live

---

**Status:** Ready to configure  
**Time Required:** 2 minutes  
**Difficulty:** Easy  
**Priority:** Critical (blocks all deployments)





