# 🚀 Deploy to Netlify - Step by Step

## Your Repository
**GitHub:** `https://github.com/JincyThazheNamath/ai-ux-audit-agent-repo`  
**Branch:** `mai`  
**Status:** ✅ All code committed and pushed

---

## Step-by-Step Deployment

### Step 1: Go to Netlify Dashboard
1. Open browser: https://app.netlify.com
2. Sign in (or create account if needed)

### Step 2: Add New Site
1. Click **"Add new site"** button (top right)
2. Select **"Import an existing project"**
3. Choose **"GitHub"** (or your Git provider)

### Step 3: Authorize & Select Repository
1. **Authorize Netlify** to access your GitHub account
2. Search for: `ai-ux-audit-agent-repo`
3. Click on your repository

### Step 4: Configure Build Settings
Netlify should auto-detect these from `netlify.toml`:

- **Branch to deploy:** `mai` (or select from dropdown)
- **Build command:** `npm run build` ✅
- **Publish directory:** `.next` ✅

**If not auto-detected, enter manually:**
- Build command: `npm run build`
- Publish directory: `.next`

Click **"Deploy site"**

### Step 5: Set Environment Variables (CRITICAL!)

**While the build is running:**

1. Go to: **Site settings** → **Environment variables** → **Add a variable**

2. Add these **4 required variables:**

   ```
   Variable name: ANTHROPIC_API_KEY
   Value: sk-ant-xxxxx... (your Claude API key from .env.local)
   Scope: All scopes
   ```

   ```
   Variable name: REDIS_URL
   Value: redis://default:xxxxx@xxxxx.redis.cloud:xxxxx (your Redis URL)
   Scope: All scopes
   ```

   ```
   Variable name: NODE_ENV
   Value: production
   Scope: All scopes
   ```

   ```
   Variable name: NETLIFY
   Value: true
   Scope: All scopes
   ```

3. Click **"Save"** after each variable

**Important:** After adding variables, Netlify will trigger a **new deployment automatically**.

### Step 6: Wait for Build
- First build takes **3-5 minutes**
- Watch the build logs in real-time
- Look for: ✅ **"Build successful"**

### Step 7: Verify Deployment

1. **Your site URL:** `https://your-site-name.netlify.app`
2. **Test the site:**
   - Open the URL
   - Try single-page audit
   - Try full-site audit (up to 40 pages)

---

## 🔍 Check Build Logs

1. Go to **Deploys** tab
2. Click on the latest deployment
3. Click **"View build log"**
4. Look for:
   - ✅ "Build completed successfully"
   - ✅ "Functions bundled successfully"
   - ❌ Any errors (check below)

---

## ⚠️ Common Issues & Fixes

### Issue 1: Build Fails - "Module not found"
**Fix:** Check that `package.json` has all dependencies

### Issue 2: Functions Timeout
**Fix:** 
- You need **Netlify Pro plan** for 26s timeout
- Upgrade: Site settings → Plan → Upgrade to Pro

### Issue 3: Environment Variables Not Working
**Fix:**
- Verify variables are set for **"Production"** scope
- Redeploy after adding variables: Deploys → Trigger deploy

### Issue 4: Redis Connection Fails
**Fix:**
- Verify `REDIS_URL` is correct
- Check Redis Labs dashboard - ensure instance is running
- Test connection from Netlify function logs

---

## 📊 After Deployment Checklist

- [ ] Site loads at Netlify URL
- [ ] Single-page audit works
- [ ] Full-site audit discovers pages
- [ ] Progress updates correctly
- [ ] All 40 pages can be audited
- [ ] No errors in Function logs
- [ ] Environment variables are set

---

## 🔄 Future Updates

**Automatic Deployment:**
- Every push to `mai` branch = automatic deploy
- Pull requests = deploy previews

**Manual Deploy:**
- Deploys tab → "Trigger deploy" → "Deploy site"

---

## 📞 Need Help?

- **Netlify Docs:** https://docs.netlify.com
- **Netlify Support:** https://www.netlify.com/support
- **Check Logs:** Deploys → Click deployment → View logs

---

## ✅ Quick Reference

**Your Repository:** `JincyThazheNamath/ai-ux-audit-agent-repo`  
**Branch:** `mai`  
**Build Command:** `npm run build`  
**Publish Directory:** `.next`  
**Required Variables:** `ANTHROPIC_API_KEY`, `REDIS_URL`, `NODE_ENV`, `NETLIFY`

**Ready to deploy!** 🚀
