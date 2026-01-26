# Quick Netlify Deployment Guide

## ✅ Status
- ✅ Netlify CLI installed and logged in
- ✅ Configuration files ready (`netlify.toml`)
- ✅ Code committed and pushed to GitHub

## 🚀 Deploy via Netlify Dashboard (Recommended - Easiest)

### Step 1: Go to Netlify Dashboard
1. Open: https://app.netlify.com
2. You should already be logged in (jincytnamath@gmail.com)

### Step 2: Import Your Project
1. Click **"Add new site"** button (top right)
2. Select **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Authorize Netlify if prompted
5. Select repository: **`ai-ux-audit-agent-repo`**
6. Select branch: **`mai`**

### Step 3: Configure Build Settings
Netlify should auto-detect Next.js, but verify:
- **Base directory:** (leave empty - app is in root)
- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Node version:** `20` (or leave default)

### Step 4: Add Environment Variables
**BEFORE clicking "Deploy site":**

1. Click **"Show advanced"** or **"Environment variables"**
2. Add these variables:

   **Variable 1:**
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** Your Anthropic API key
   - **Scopes:** ✅ Production, ✅ Deploy previews, ✅ Branch deploys

   **Variable 2:**
   - **Key:** `REDIS_URL`
   - **Value:** `redis://default:aYHlJUvTU2gFuZ1OK9H9IO9fz8fb8WVf@redis-13060.c265.us-east-1-2.ec2.cloud.redislabs.com:13060`
   - **Scopes:** ✅ Production, ✅ Deploy previews, ✅ Branch deploys

3. Click **"Save"** after each variable

### Step 5: Deploy
1. Click **"Deploy site"** button
2. Wait for build to complete (~3-5 minutes)
3. Your site will be live at: `https://[random-name].netlify.app`

### Step 6: Verify Deployment
1. Visit your Netlify site URL
2. Test single page audit
3. Check function logs in Netlify Dashboard → Functions

## 🔧 Alternative: Deploy via CLI (If Dashboard Doesn't Work)

If you prefer CLI, try this non-interactive approach:

```bash
cd "C:\Users\User\OneDrive\Desktop\UX-Audit\ai-ux-audit-agent-repo"

# Create a new site (non-interactive)
netlify sites:create --name ai-ux-audit-agent

# Link to the site
netlify link

# Set environment variables
netlify env:set ANTHROPIC_API_KEY "your-key-here" --context production
netlify env:set REDIS_URL "redis://default:aYHlJUvTU2gFuZ1OK9H9IO9fz8fb8WVf@redis-13060.c265.us-east-1-2.ec2.cloud.redislabs.com:13060" --context production

# Deploy
netlify deploy --prod
```

## 📋 Important Notes

### Function Timeout Limits
- **Netlify Free:** 10 seconds max per function
- **Netlify Pro:** 26 seconds max per function
- **Your audit functions:** Need 60-300 seconds

**Impact:**
- Single page audits may timeout on free tier
- Full site audits will definitely timeout

**Solutions:**
1. **Upgrade to Netlify Pro** ($19/month) for 26s timeout
2. **Break into smaller batches** (already implemented)
3. **Use background jobs** (trigger next batch asynchronously)

### What Works on Netlify
- ✅ Next.js SSR and static pages
- ✅ API routes (as serverless functions)
- ✅ Redis connection (via REDIS_URL)
- ✅ Environment variables
- ✅ Custom domains

### What's Different from Vercel
- ⚠️ Function timeout is shorter (10s free, 26s pro vs 60s pro on Vercel)
- ⚠️ No `waitUntil` for background jobs (but background jobs still work)
- ✅ Similar performance and features otherwise

## 🧪 Testing After Deployment

1. **Visit your site:** `https://[your-site].netlify.app`
2. **Test single page audit:**
   - Enter `example.com`
   - Click "Audit Page"
   - Should complete in < 10 seconds (free tier limit)
3. **Test full site audit:**
   - May timeout on free tier
   - Consider upgrading to Pro for longer audits
4. **Check logs:**
   - Netlify Dashboard → Functions → View logs
   - Look for: `✅ Redis connected successfully`

## 🎉 Success!

Once deployed, you'll have:
- ✅ Production URL: `https://[your-site].netlify.app`
- ✅ Automatic deployments on git push
- ✅ Preview deployments for PRs
- ✅ Function logs and monitoring

## 📞 Need Help?

- Check build logs in Netlify Dashboard
- Review function logs for errors
- Verify environment variables are set
- Test Redis connection separately

---

**Next Steps:**
1. Deploy via Dashboard (follow steps above)
2. Test the deployment
3. Consider Netlify Pro if you need longer timeouts
4. Set up custom domain (optional)

