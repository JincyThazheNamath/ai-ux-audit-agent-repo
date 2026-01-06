# Deploy to Vercel - Quick Guide

## Method 1: GitHub Integration (Recommended - No Permission Issues)

### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Sign in with your GitHub account (jincythazhenamath)

### Step 2: Select Your Project
1. Find and click on: **ux-audit-agent**
2. Or create a new project if it doesn't exist

### Step 3: Deploy from Branch
1. Click on **"Deployments"** tab (top navigation)
2. Click **"Create Deployment"** button (top right)
3. In the deployment modal:
   - **Repository**: Select `Automated_UX_Fix`
   - **Branch**: Select `lighthouse-alignment-performance-metrics`
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `ux-audit-agent`
4. Click **"Deploy"**

### Step 4: Verify Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Ensure `ANTHROPIC_API_KEY` is set for:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
3. If missing, add it:
   - Key: `ANTHROPIC_API_KEY`
   - Value: Your API key (starts with `sk-ant-`)
   - Apply to: All environments

### Step 5: Wait for Deployment
- Build will take 2-5 minutes
- Watch the build logs for progress
- Deployment URL will be provided when complete

---

## Method 2: Fix CLI Permissions (Alternative)

If you prefer using CLI:

1. **Fix Git Author Permissions:**
   - Visit: https://vercel.com/docs/deployments/troubleshoot-project-collaboration
   - Ensure your GitHub account has access to the Vercel team
   - Link your GitHub account in Vercel settings

2. **Then run:**
   ```bash
   cd ux-audit-agent
   vercel --prod
   ```

---

## Current Deployment Configuration

✅ **Branch**: `lighthouse-alignment-performance-metrics`
✅ **Build Command**: `npm run build`
✅ **Output Directory**: `.next`
✅ **Function Timeout**: 60 seconds
✅ **Memory**: 1024 MB

## What Will Be Deployed

- ✅ Real performance metrics (FCP, LCP, TTI, TBT, CLS, Speed Index)
- ✅ Lighthouse-style scoring
- ✅ Accessibility tree analysis
- ✅ Enhanced SEO validation
- ✅ Error boundary components
- ✅ All latest improvements

---

## After Deployment

1. **Test the deployment:**
   - Visit your Vercel deployment URL
   - Test with: `https://tabb.cc/`
   - Verify metrics are collected

2. **Set Production Branch (Optional):**
   - Go to Settings → Git
   - Set production branch to `lighthouse-alignment-performance-metrics`
   - Or merge to `main` first, then set `main` as production

3. **Monitor:**
   - Check function logs in Vercel Dashboard
   - Monitor execution times
   - Verify no errors

---

**Quick Link**: https://vercel.com/dashboard


