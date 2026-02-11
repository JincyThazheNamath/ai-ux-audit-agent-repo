# Deploy to Netlify - Step by Step

## 🚀 Quick Deployment Guide

### Option 1: Deploy via GitHub (Recommended - Automatic)

**If your Netlify site is connected to GitHub:**

1. **Commit your changes** (run these commands manually in PowerShell as Administrator):
   ```powershell
   cd c:\Users\User\Jincy\UX-Audit\ai-ux-audit-agent-repo
   
   # Stage all changes
   git add .
   
   # Commit
   git commit -m "Optimize Netlify timeout handling - 22s balanced timeout"
   
   # Push to GitHub
   git push origin mai
   ```

2. **Netlify will automatically deploy** when you push to GitHub
   - Go to: https://app.netlify.com
   - Check your site's deploy logs
   - Deployment will start automatically

### Option 2: Deploy via Netlify CLI (Manual)

**If you want to deploy manually:**

1. **Open PowerShell as Administrator** (to avoid permission issues)

2. **Navigate to project:**
   ```powershell
   cd c:\Users\User\Jincy\UX-Audit\ai-ux-audit-agent-repo
   ```

3. **Deploy to production:**
   ```powershell
   netlify deploy --prod
   ```

4. **If you need to set environment variables:**
   ```powershell
   netlify env:set ANTHROPIC_API_KEY "your-key" --context production
   netlify env:set REDIS_URL "your-redis-url" --context production
   netlify env:set NETLIFY_DATABASE_URL "your-neon-url" --context production
   ```

### Option 3: Deploy via Netlify Dashboard

1. **Go to:** https://app.netlify.com
2. **Select your site**
3. **Click "Trigger deploy"** → **"Deploy site"**
4. **Or push to GitHub** and it will auto-deploy

## ✅ Pre-Deployment Checklist

- [ ] All changes committed (or ready to commit)
- [ ] Environment variables set in Netlify Dashboard:
  - `ANTHROPIC_API_KEY`
  - `REDIS_URL` or `NETLIFY_DATABASE_URL`
- [ ] Netlify Pro plan active (for 26s timeout)
- [ ] `netlify.toml` configured correctly

## 📋 Files Changed (Ready to Deploy)

- ✅ `lib/config.ts` - Balanced 22s timeout
- ✅ `lib/auditHelper.ts` - Optimized timeouts
- ✅ `app/api/audit/retry/route.ts` - Optimized retry API
- ✅ `netlify.toml` - Added retry route timeout
- ✅ Documentation files added

## 🎯 After Deployment

1. **Test single page audit** - Should work with optimized timeouts
2. **Test full site audit** - Should have better success rate
3. **Test retry API** - Should complete without timing out
4. **Check Netlify logs** - Monitor function execution times

## 🔍 Verify Deployment

1. Visit your Netlify site URL
2. Check function logs: Netlify Dashboard → Functions → View logs
3. Look for: "✅ Neon database initialized" or "✅ Redis connected"
4. Test audit functionality

---

**Note:** If you have permission issues with git, try running PowerShell as Administrator.
