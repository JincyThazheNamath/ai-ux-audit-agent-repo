# Deploy to Netlify via Dashboard (Recommended)

## Why Dashboard Deployment?

The Netlify CLI has issues with:
- Function size limits (250MB)
- Blobs configuration
- Large dependencies like Chromium

**Dashboard deployment handles these automatically.**

## Step-by-Step Dashboard Deployment

### Step 1: Go to Netlify Dashboard
1. Visit: https://app.netlify.com
2. Sign in with your GitHub account

### Step 2: Import Project
1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Authorize Netlify to access your repositories
4. Select repository: `ai-ux-audit-agent-repo`
5. Click **"Import"**

### Step 3: Configure Build Settings
Netlify should auto-detect Next.js, but verify:

- **Base directory:** (leave empty - app is in root)
- **Build command:** `npm run build`
- **Publish directory:** `.next`
- **Node version:** `20` (set in Environment variables)

### Step 4: Set Environment Variables
**CRITICAL:** Set these before deploying!

1. Go to **Site settings** → **Environment variables**
2. Click **"Add a variable"**

Add these variables:

**Required:**
- **Key:** `ANTHROPIC_API_KEY`
- **Value:** Your Anthropic API key (starts with `sk-ant-`)
- **Scopes:** ✅ Production, ✅ Deploy previews, ✅ Branch deploys

**Required for Redis:**
- **Key:** `REDIS_URL`
- **Value:** Your Redis Labs connection string
  - Format: `redis://default:password@host:port`
  - Example: `redis://default:abc123@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345`
- **Scopes:** ✅ Production, ✅ Deploy previews, ✅ Branch deploys

**Optional (for Node version):**
- **Key:** `NODE_VERSION`
- **Value:** `20`
- **Scopes:** ✅ Production, ✅ Deploy previews, ✅ Branch deploys

3. Click **"Save"** after each variable

### Step 5: Configure Function Settings (Netlify Pro Required)
⚠️ **You need Netlify Pro ($19/month) for 26s timeout**

1. Go to **Site settings** → **Functions**
2. Verify function timeouts are set to **26 seconds** (Pro plan)
3. If not on Pro, upgrade at: https://app.netlify.com/account/billing

### Step 6: Deploy
1. Go back to **Deployments** tab
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Wait for build to complete (~3-5 minutes)
4. Your app will be live at: `https://your-site-name.netlify.app`

## Troubleshooting Function Size Error

If you get "function exceeds 250MB" error:

### Solution 1: Deploy via Dashboard (Recommended)
The dashboard handles large functions better than CLI.

### Solution 2: Verify Chromium Externalization
Chromium should already be externalized in `next.config.js`:
```javascript
config.externals.push('@sparticuz/chromium');
```

### Solution 3: Check Build Logs
- Go to **Deployments** → Click on deployment → **View build log**
- Look for function bundling errors
- Check if Chromium is being included

### Solution 4: Contact Netlify Support
If function is still too large, contact Netlify support to increase limit.

## After Deployment

### Test Your Site
1. Visit your Netlify URL: `https://your-site-name.netlify.app`
2. Test single page audit
3. Test full site audit
4. Check function logs in **Functions** tab

### Monitor Function Logs
1. Go to **Functions** tab
2. Click on a function (e.g., `/api/audit/batch`)
3. View **Logs** to see execution details
4. Look for:
   - ✅ `Redis connected successfully`
   - ✅ `Final result saved successfully`
   - ❌ Any OOM errors

### Cleanup Redis (if needed)
If you get Redis OOM errors:
```bash
# Call cleanup endpoint
curl -X POST https://your-site.netlify.app/api/audit/cleanup
```

## Expected Build Output

Successful build should show:
```
✓ Compiled successfully
✓ Generating static pages (11/11)
✓ Functions bundling completed
✓ Deploying functions
✓ Site deployed successfully
```

## Common Issues

### Issue: Build Fails
**Check:**
- Environment variables are set correctly
- Node version is 20
- All dependencies in package.json

### Issue: Function Timeout
**Solution:**
- Upgrade to Netlify Pro ($19/month)
- Batch size is already optimized to 2 pages

### Issue: Redis Connection Fails
**Check:**
- `REDIS_URL` environment variable is set
- Redis Labs database is active
- Connection string format is correct

### Issue: Function Too Large
**Solution:**
- Deploy via Dashboard (handles this better)
- Chromium is already externalized
- Contact Netlify support if needed

---

**Status:** Ready for Dashboard Deployment  
**Estimated Time:** 10-15 minutes  
**Cost:** Netlify Pro ($19/month) required for 26s timeout
