# 🚀 Netlify Deployment Guide

## Prerequisites

✅ **Netlify Account** - Sign up at [netlify.com](https://netlify.com) (free tier works)  
✅ **Git Repository** - Your code should be in GitHub, GitLab, or Bitbucket  
✅ **Netlify Pro Plan** - Required for 26s function timeout (free tier has 10s limit)

---

## Method 1: Git-Based Deployment (Recommended - Automatic)

### Step 1: Connect Repository to Netlify

1. **Go to Netlify Dashboard**
   - Visit [app.netlify.com](https://app.netlify.com)
   - Sign in with your account

2. **Add New Site**
   - Click **"Add new site"** → **"Import an existing project"**
   - Choose your Git provider (GitHub/GitLab/Bitbucket)
   - Authorize Netlify to access your repositories

3. **Select Repository**
   - Find and select `UX-Audit` or `ai-ux-audit-agent-repo`
   - Click **"Next"**

4. **Configure Build Settings**
   - **Branch to deploy:** `main` or `mai` (whichever you're using)
   - **Build command:** `npm run build` (should auto-detect)
   - **Publish directory:** `.next` (should auto-detect)
   - Click **"Deploy site"**

### Step 2: Configure Environment Variables

**CRITICAL:** Set these in Netlify Dashboard before testing:

1. **Go to Site Settings**
   - Your site → **Site settings** → **Environment variables**

2. **Add Required Variables:**

   ```
   ANTHROPIC_API_KEY = sk-ant-xxxxx... (your Claude API key)
   REDIS_URL = redis://default:xxxxx@xxxxx.redis.cloud:xxxxx (your Redis Labs URL)
   NODE_ENV = production
   NETLIFY = true
   ```

   **Optional (if using Neon PostgreSQL):**
   ```
   NETLIFY_DATABASE_URL = postgresql://user:pass@host/dbname
   ```

3. **Save** - Netlify will trigger a new deployment

### Step 3: Verify Deployment

1. **Check Build Logs**
   - Go to **Deploys** tab
   - Click on the latest deployment
   - Check build logs for errors

2. **Test Your Site**
   - Visit your Netlify URL (e.g., `https://your-site.netlify.app`)
   - Test a single-page audit
   - Test a full-site audit (up to 40 pages)

---

## Method 2: Manual Deployment (Netlify CLI)

### Step 1: Install Netlify CLI

```powershell
npm install -g netlify-cli
```

### Step 2: Login to Netlify

```powershell
netlify login
```

This opens a browser window to authorize Netlify CLI.

### Step 3: Initialize Site (First Time Only)

```powershell
cd "C:\Users\User\OneDrive\Desktop\UX-Audit\ai-ux-audit-agent-repo"
netlify init
```

Follow the prompts:
- **Create & configure a new site** (or link to existing)
- **Team:** Select your team
- **Site name:** Enter a name (or leave blank for auto-generated)

### Step 4: Set Environment Variables

```powershell
netlify env:set ANTHROPIC_API_KEY "sk-ant-xxxxx..."
netlify env:set REDIS_URL "redis://default:xxxxx@xxxxx.redis.cloud:xxxxx"
netlify env:set NODE_ENV "production"
netlify env:set NETLIFY "true"
```

### Step 5: Build and Deploy

```powershell
# Build the site
npm run build

# Deploy to production
netlify deploy --prod
```

**For preview deployment (testing):**
```powershell
netlify deploy
```

---

## Method 3: Drag & Drop Deployment

### Step 1: Build Locally

```powershell
cd "C:\Users\User\OneDrive\Desktop\UX-Audit\ai-ux-audit-agent-repo"
npm run build
```

### Step 2: Deploy via Netlify Dashboard

1. Go to [app.netlify.com](https://app.netlify.com)
2. Drag and drop the `.next` folder onto the deploy area
3. **Note:** This method doesn't work well for Next.js API routes - use Git-based deployment instead

---

## ⚙️ Configuration Files

Your project already has `netlify.toml` configured with:

✅ **Build command:** `npm run build`  
✅ **Publish directory:** `.next`  
✅ **Function timeouts:** 26s (requires Pro plan)  
✅ **Node version:** 20  
✅ **Redirects:** Configured for Next.js routing  

---

## 🔧 Post-Deployment Checklist

### 1. Verify Environment Variables

- [ ] `ANTHROPIC_API_KEY` is set
- [ ] `REDIS_URL` is set (or `NETLIFY_DATABASE_URL` if using Neon)
- [ ] `NODE_ENV` = `production`
- [ ] `NETLIFY` = `true`

### 2. Test Functionality

- [ ] Single-page audit works
- [ ] Full-site audit discovers pages
- [ ] Progress updates correctly
- [ ] All 40 pages can be audited
- [ ] Results display correctly

### 3. Check Function Logs

- [ ] Go to **Functions** tab in Netlify Dashboard
- [ ] Check logs for errors
- [ ] Verify batch processing logs appear
- [ ] Confirm no timeout errors

### 4. Monitor Performance

- [ ] Check function execution times (should be < 26s)
- [ ] Monitor Redis connection (should be fast)
- [ ] Verify no "signal is aborted without reason" errors

---

## 🐛 Troubleshooting

### Build Fails

**Error: "Module not found"**
```powershell
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Error: "SWC compilation failed"**
- Check Node version (should be 20)
- Verify `next.config.js` is correct

### Functions Timeout

**Error: "Function execution exceeded 10s"**
- You need **Netlify Pro plan** for 26s timeout
- Upgrade at: Netlify Dashboard → Site settings → Plan

### Environment Variables Not Working

1. Go to **Site settings** → **Environment variables**
2. Verify variables are set for **Production**
3. Redeploy after adding variables

### Redis Connection Fails

1. Verify `REDIS_URL` is correct
2. Check Redis Labs dashboard - ensure instance is running
3. Test connection from Netlify function logs

---

## 📊 Monitoring

### View Logs

1. **Netlify Dashboard** → Your Site → **Functions**
2. Click on a function (e.g., `app/api/audit/batch/route.ts`)
3. View real-time logs

### Check Deployment Status

- **Deploys** tab shows all deployments
- Green checkmark = successful
- Red X = failed (check logs)

---

## 🔄 Continuous Deployment

Once connected to Git:

✅ **Automatic deploys** on every push to `main` branch  
✅ **Deploy previews** for pull requests  
✅ **Rollback** to previous deployments if needed  

### Trigger Manual Deploy

1. Go to **Deploys** tab
2. Click **"Trigger deploy"** → **"Deploy site"**
3. Select branch to deploy

---

## 📝 Quick Reference

### Netlify Dashboard URLs

- **Dashboard:** https://app.netlify.com
- **Site Settings:** Your Site → Site settings
- **Environment Variables:** Site settings → Environment variables
- **Functions:** Your Site → Functions
- **Deploys:** Your Site → Deploys

### Important Commands

```powershell
# Login
netlify login

# Deploy to production
netlify deploy --prod

# View environment variables
netlify env:list

# View function logs
netlify functions:list
netlify functions:log <function-name>
```

---

## ✅ Success Indicators

After deployment, you should see:

✅ Site loads at `https://your-site.netlify.app`  
✅ Single-page audit completes successfully  
✅ Full-site audit discovers and audits all pages  
✅ Progress updates in real-time  
✅ No "Failed to check progress" errors  
✅ All 40 pages complete without stopping  
✅ Results display with green checkmarks for completed pages  

---

## 🆘 Need Help?

- **Netlify Docs:** https://docs.netlify.com
- **Netlify Support:** https://www.netlify.com/support
- **Check Build Logs:** Deploys tab → Click deployment → View logs
