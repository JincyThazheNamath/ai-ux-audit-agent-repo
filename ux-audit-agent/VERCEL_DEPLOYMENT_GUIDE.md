# Vercel Deployment Guide - Lighthouse Alignment Update

## Professional CTO Deployment Checklist

### ✅ Pre-Deployment Verification

1. **Build Status**: ✅ Build successful
   - All TypeScript types validated
   - No compilation errors
   - All dependencies installed

2. **Configuration Files**: ✅ Verified
   - `vercel.json` - Function timeout configured (60s)
   - `next.config.js` - Webpack externals configured for Chromium
   - `package.json` - All dependencies up to date

3. **Branch Status**: ✅ Ready
   - Branch: `lighthouse-alignment-performance-metrics`
   - All changes committed and pushed to GitHub

### 🚀 Deployment Methods

#### Method 1: GitHub Integration (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Navigate to your project: `ux-audit-agent`

2. **Deploy from Branch**
   - Click "Deployments" tab
   - Click "Create Deployment"
   - Select branch: `lighthouse-alignment-performance-metrics`
   - Click "Deploy"

3. **Production Deployment**
   - After successful preview deployment
   - Go to "Settings" → "Git"
   - Set production branch to: `lighthouse-alignment-performance-metrics` (or merge to main first)
   - Future commits will auto-deploy

#### Method 2: Vercel CLI (After Permission Fix)

1. **Fix Git Author Permissions**
   - Ensure your GitHub account has access to the Vercel team
   - Visit: https://vercel.com/docs/deployments/troubleshoot-project-collaboration

2. **Deploy Command**
   ```bash
   cd ux-audit-agent
   vercel --prod
   ```

### 🔐 Environment Variables

**Required Environment Variable:**
- `ANTHROPIC_API_KEY` - Your Anthropic Claude API key (starts with `sk-ant-`)

**Verify in Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Ensure `ANTHROPIC_API_KEY` is set for:
   - Production
   - Preview
   - Development

### 📋 Deployment Configuration

**Current `vercel.json` Configuration:**
```json
{
  "functions": {
    "app/api/audit/route.ts": {
      "maxDuration": 60
    }
  }
}
```

**Why 60 seconds?**
- Performance metrics collection: ~5-10s
- Accessibility tree analysis: ~2-5s
- SEO validation: ~1-2s
- AI analysis: ~10-30s
- Total: ~20-50s (60s provides buffer)

### 🎯 What's Being Deployed

**New Features:**
- ✅ Real performance metrics (FCP, LCP, TTI, TBT, CLS, Speed Index)
- ✅ Lighthouse-style performance score calculation
- ✅ Accessibility tree analysis
- ✅ Enhanced SEO validation
- ✅ Error boundary components
- ✅ Improved type definitions

**Files Changed:**
- `app/api/audit/route.ts` - Core audit logic with Lighthouse metrics
- `types/audit.ts` - Added realMetrics interface
- `app/layout.tsx` - Background styling fixes
- `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx` - Error handling

### 🔍 Post-Deployment Verification

1. **Test the Deployment**
   - Visit your Vercel deployment URL
   - Test with: `https://tabb.cc/`
   - Verify performance metrics are collected
   - Check that scores align with Lighthouse

2. **Monitor Function Logs**
   - Go to Vercel Dashboard → Deployments → [Your Deployment] → Functions
   - Check for any errors in `/api/audit` function
   - Verify Chromium is loading correctly

3. **Performance Check**
   - Ensure function completes within 60s timeout
   - Verify screenshots are captured
   - Check that real metrics are returned in response

### 🐛 Troubleshooting

**Issue: Function Timeout**
- Solution: Already configured to 60s in `vercel.json`
- If still timing out, check network latency to target URL

**Issue: Chromium Not Found**
- Solution: `@sparticuz/chromium` is configured in `next.config.js`
- Verify it's in `package.json` dependencies

**Issue: Environment Variable Missing**
- Solution: Add `ANTHROPIC_API_KEY` in Vercel Dashboard
- Ensure it's set for all environments (Production, Preview, Development)

**Issue: Build Fails**
- Solution: Check build logs in Vercel Dashboard
- Verify all dependencies are in `package.json`
- Ensure TypeScript compilation succeeds

### 📊 Expected Deployment Results

**Build Output:**
```
Route (app)                              Size     First Load JS
┌ ○ /                                    11.6 kB        98.8 kB
├ ○ /_not-found                          138 B          87.4 kB
└ ƒ /api/audit                           0 B                0 B
```

**Function Configuration:**
- Runtime: Node.js (auto-detected)
- Memory: 1024 MB (default)
- Max Duration: 60 seconds
- Region: Auto (or specify in vercel.json)

### 🎉 Success Criteria

✅ Build completes without errors
✅ All routes compile successfully
✅ Environment variables are set
✅ Function deploys with 60s timeout
✅ Test audit completes successfully
✅ Real metrics are returned in API response

### 📝 Next Steps After Deployment

1. **Merge to Main** (if using branch deployment)
   ```bash
   git checkout main
   git merge lighthouse-alignment-performance-metrics
   git push origin main
   ```

2. **Update Production Branch**
   - In Vercel Dashboard → Settings → Git
   - Set production branch to `main`

3. **Monitor Performance**
   - Check function execution times
   - Monitor API usage (Anthropic)
   - Review error rates

---

**Deployment Status**: ✅ Ready for Deployment
**Build Status**: ✅ Successful
**Configuration**: ✅ Optimized for Vercel Serverless



