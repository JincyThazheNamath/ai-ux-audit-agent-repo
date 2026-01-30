# 🚀 Deploy to Netlify - Complete Guide

## ✅ Pre-Deployment Checklist

- ✅ Code committed: `af7fc51 Fix: Complete 40-page audit support`
- ✅ Code pushed to GitHub: `JincyThazheNamath/ai-ux-audit-agent-repo`
- ✅ Branch: `mai`
- ✅ Configuration: `netlify.toml` ready

---

## 📋 Step-by-Step Deployment

### Step 1: Open Netlify Dashboard
1. Go to: **https://app.netlify.com**
2. Sign in (or create free account)

### Step 2: Import Your Repository
1. Click **"Add new site"** (top right)
2. Select **"Import an existing project"**
3. Choose **"GitHub"**
4. **Authorize Netlify** to access your GitHub account
5. Search for: `ai-ux-audit-agent-repo`
6. Click on the repository

### Step 3: Configure Build Settings
Netlify should **auto-detect** from `netlify.toml`:

- **Branch to deploy:** `mai` ✅
- **Build command:** `npm run build` ✅
- **Publish directory:** `.next` ✅

**If not auto-detected, enter:**
- Build command: `npm run build`
- Publish directory: `.next`

Click **"Deploy site"** button

### Step 4: Set Environment Variables (CRITICAL!)

**Go to:** Site settings → Environment variables → **Add a variable**

Add these **4 variables** (one at a time):

#### 1. ANTHROPIC_API_KEY
```
Variable name: ANTHROPIC_API_KEY
Value: <your-anthropic-api-key-from-console.anthropic.com>
Scope: All scopes
```

#### 2. NETLIFY_DATABASE_URL (You're using Neon PostgreSQL)
```
Variable name: NETLIFY_DATABASE_URL
Value: <your-neon-connection-string-from-neon.tech-dashboard>
Scope: All scopes
```

#### 3. NODE_ENV
```
Variable name: NODE_ENV
Value: production
Scope: All scopes
```

#### 4. NETLIFY
```
Variable name: NETLIFY
Value: true
Scope: All scopes
```

**After adding each variable:** Click **"Save"**

**Important:** After adding variables, Netlify will **automatically trigger a new deployment**.

### Step 5: Wait for Build
- ⏱️ First build: **3-5 minutes**
- Watch build logs in real-time
- Look for: ✅ **"Build completed successfully"**

### Step 6: Verify Deployment

1. **Your site URL:** `https://your-site-name.netlify.app`
2. **Test:**
   - Open the URL
   - Try **single-page audit**
   - Try **full-site audit** (up to 40 pages)
   - Check progress updates work

---

## 🔍 Monitor Deployment

### View Build Logs
1. **Deploys** tab → Click latest deployment
2. **"View build log"** → Check for errors
3. Look for:
   - ✅ "Build completed successfully"
   - ✅ "Functions bundled successfully"
   - ✅ "Deploy log"

### View Function Logs
1. **Functions** tab → Click on a function
2. View real-time execution logs
3. Check for:
   - ✅ Successful API calls
   - ✅ Redis/Neon connections working
   - ❌ Any errors

---

## ⚠️ Important Notes

### Netlify Pro Plan Required
- **Free tier:** 10s function timeout ❌ (too short)
- **Pro tier:** 26s function timeout ✅ (required)
- **Upgrade:** Site settings → Plan → Upgrade to Pro

### Environment Variables
- **Must be set** before testing
- **Redeploy** after adding variables
- **Check** they're set for "Production" scope

---

## 🐛 Troubleshooting

### Build Fails
**Check:**
- Build logs for specific error
- Node version (should be 20)
- Dependencies in `package.json`

**Fix:**
```powershell
npm install
npm run build
```

### Functions Timeout
**Problem:** Functions exceed 10s limit  
**Solution:** Upgrade to Netlify Pro plan (26s limit)

### Database Connection Fails
**Check:**
- `NETLIFY_DATABASE_URL` is set correctly
- Neon database is running
- Connection string format is correct

### Environment Variables Not Working
**Check:**
- Variables are set for "Production" scope
- Variable names match exactly (case-sensitive)
- Redeploy after adding variables

---

## ✅ Post-Deployment Checklist

After deployment completes:

- [ ] Site loads at Netlify URL
- [ ] Single-page audit works
- [ ] Full-site audit discovers pages
- [ ] Progress updates correctly
- [ ] All 40 pages can be audited
- [ ] No errors in Function logs
- [ ] Environment variables are set
- [ ] Netlify Pro plan is active (for 26s timeout)

---

## 🔄 Future Updates

**Automatic Deployment:**
- Every push to `mai` branch = automatic deploy
- Pull requests = deploy previews

**Manual Deploy:**
- Deploys tab → "Trigger deploy" → "Deploy site"

---

## 📞 Quick Reference

**Repository:** `JincyThazheNamath/ai-ux-audit-agent-repo`  
**Branch:** `mai`  
**Build:** `npm run build`  
**Publish:** `.next`  
**Plan:** Netlify Pro (required for 26s timeout)

**Environment Variables:**
- `ANTHROPIC_API_KEY` ✅
- `NETLIFY_DATABASE_URL` ✅ (Neon PostgreSQL)
- `NODE_ENV` = `production` ✅
- `NETLIFY` = `true` ✅

---

## 🎯 You're Ready!

All code is committed and pushed. Just:
1. Connect repository to Netlify
2. Set environment variables
3. Deploy!

**Your site will be live in ~5 minutes!** 🚀
