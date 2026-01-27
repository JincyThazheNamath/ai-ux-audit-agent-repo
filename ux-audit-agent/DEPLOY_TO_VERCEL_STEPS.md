# Deploy to Vercel - Step by Step Guide

## ✅ Quick Deployment Steps

### Step 1: Access Vercel Dashboard
1. Open your browser and go to: **https://vercel.com/dashboard**
2. Sign in with your GitHub account (jincythazhenamath)

### Step 2: Select Your Project
1. In the Vercel Dashboard, find and click on: **ux-audit-agent**
2. If the project doesn't exist, click **"Add New"** → **"Project"**
   - Import from GitHub: Select `Automated_UX_Fix` repository
   - Root Directory: `ux-audit-agent`
   - Framework: Next.js (auto-detected)

### Step 3: Create New Deployment
1. Click on the **"Deployments"** tab (top navigation bar)
2. Click the **"Create Deployment"** button (top right, blue button)
3. In the deployment modal:
   - **Repository**: `JincyThazheNamath/Automated_UX_Fix`
   - **Branch**: Select `main` (or `lighthouse-alignment-performance-metrics` if you want to test first)
   - **Root Directory**: `ux-audit-agent` (if not auto-detected)
   - **Framework Preset**: Next.js (should be auto-detected)
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `.next` (auto-filled)
4. Click **"Deploy"** button

### Step 4: Verify Environment Variables
**IMPORTANT**: Before deployment completes, verify environment variables:

1. Go to **Settings** → **Environment Variables**
2. Check if `ANTHROPIC_API_KEY` exists
3. If missing, click **"Add New"**:
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: Your Anthropic API key (starts with `sk-ant-`)
   - **Environment**: Select all three:
     - ✅ Production
     - ✅ Preview
     - ✅ Development
4. Click **"Save"**

### Step 5: Monitor Deployment
1. Watch the build logs in real-time
2. Build typically takes 2-5 minutes
3. You'll see progress for:
   - Installing dependencies
   - Building Next.js application
   - Deploying to Vercel Edge Network

### Step 6: Access Your Deployment
Once deployment completes:
1. You'll see a **"Visit"** button or deployment URL
2. Click to open your live application
3. URL format: `https://ux-audit-agent-xxxxx.vercel.app`

---

## 🔧 Configuration Details

### Current Vercel Configuration (`vercel.json`):
```json
{
  "functions": {
    "app/api/audit/route.ts": {
      "maxDuration": 60,
      "memory": 1024
    }
  },
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

### What This Means:
- **Function Timeout**: 60 seconds (sufficient for full audit)
- **Memory**: 1024 MB (optimal for Puppeteer/Chromium)
- **Build**: Standard Next.js build process

---

## ✅ Pre-Deployment Checklist

- [x] Code pushed to GitHub (main branch)
- [x] Build successful locally (`npm run build`)
- [x] Environment variables documented
- [x] Vercel configuration optimized
- [x] All dependencies in package.json
- [x] TypeScript compilation successful

---

## 🚀 What Will Be Deployed

### New Features:
- ✅ Real performance metrics (FCP, LCP, TTI, TBT, CLS, Speed Index)
- ✅ Lighthouse-style performance scoring
- ✅ Accessibility tree analysis
- ✅ Enhanced SEO validation
- ✅ Error boundary components
- ✅ Improved type safety

### Files:
- All application code from `main` branch
- Optimized Vercel configuration
- Error handling components
- Updated type definitions

---

## 🐛 Troubleshooting

### Issue: Build Fails
**Solution**: 
- Check build logs in Vercel Dashboard
- Verify all dependencies are in `package.json`
- Ensure TypeScript compilation succeeds

### Issue: Function Timeout
**Solution**: 
- Already configured to 60s in `vercel.json`
- If still timing out, check network latency to target URL

### Issue: Environment Variable Missing
**Solution**: 
- Add `ANTHROPIC_API_KEY` in Settings → Environment Variables
- Ensure it's set for all environments

### Issue: Chromium Not Found
**Solution**: 
- `@sparticuz/chromium` is configured in `next.config.js`
- Verify it's in `package.json` dependencies (it is)

---

## 📊 Expected Build Output

```
Route (app)                              Size     First Load JS
┌ ○ /                                    11.6 kB        98.8 kB
├ ○ /_not-found                          138 B          87.4 kB
└ ƒ /api/audit                           0 B                0 B
```

---

## 🎯 Post-Deployment

1. **Test the Deployment**:
   - Visit your Vercel URL
   - Test with: `https://tabb.cc/`
   - Verify performance metrics are collected
   - Check that scores align with Lighthouse

2. **Set Production Branch** (Optional):
   - Go to Settings → Git
   - Set production branch to `main`
   - Future commits to main will auto-deploy

3. **Monitor**:
   - Check function logs in Vercel Dashboard
   - Monitor execution times
   - Verify no errors in logs

---

## 🔗 Quick Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Project Settings**: https://vercel.com/dashboard → Select project → Settings
- **Deployments**: https://vercel.com/dashboard → Select project → Deployments
- **Environment Variables**: Settings → Environment Variables

---

**Status**: ✅ Ready for Deployment  
**Branch**: `main`  
**Build**: ✅ Successful  
**Configuration**: ✅ Optimized



