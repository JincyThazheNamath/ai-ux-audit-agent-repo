# Netlify Production Checklist - Neon Database

## ✅ Required Environment Variables in Netlify Dashboard

Set these in **Netlify Dashboard → Site settings → Environment variables**:

### 1. ANTHROPIC_API_KEY (Required)
- **Key:** `ANTHROPIC_API_KEY`
- **Value:** Your Anthropic API key (starts with `sk-ant-`)
- **Scopes:** ✅ Production, ✅ Deploy previews, ✅ Branch deploys
- **Note:** Get your API key from https://console.anthropic.com/

### 2. NETLIFY_DATABASE_URL (Required for Neon)
**Option A: Link Neon Database (Recommended)**
1. Go to **Data → Neon** in Netlify Dashboard
2. Click **"Create Database"** or **"Link Database"**
3. Follow prompts
4. Netlify automatically sets `NETLIFY_DATABASE_URL`

**Option B: Set Manually**
- **Key:** `NETLIFY_DATABASE_URL`
- **Value:** Your Neon PostgreSQL connection string
- **Format:** `postgresql://username:password@host/database?sslmode=require`
- **Scopes:** ✅ Production, ✅ Deploy previews, ✅ Branch deploys
- **Note:** Get connection string from Neon Dashboard → Connection Details

### 3. NODE_VERSION (Optional but Recommended)
- **Key:** `NODE_VERSION`
- **Value:** `20`
- **Scopes:** ✅ Production, ✅ Deploy previews, ✅ Branch deploys

## ✅ Build Settings Verification

Verify in **Site settings → Build & deploy**:

- ✅ **Base directory:** (empty)
- ✅ **Build command:** `npm run build`
- ✅ **Publish directory:** `.next`
- ✅ **Node version:** `20` (or set via NODE_VERSION env var)

## ✅ Netlify Pro Plan (Important!)

**Function Timeout Requirements:**
- **Free Tier:** 10 seconds max (too short for audits)
- **Pro Tier:** 26 seconds max (configured in `netlify.toml`)

**You need Netlify Pro ($19/month) for full-site audits to work!**

The code is configured for 26s timeout:
- Batch size: 2 pages per batch
- Optimized for Pro plan

## ✅ Automatic Setup (No Manual Configuration Needed)

These are handled automatically:

1. **Database Tables** - Created automatically on first use:
   - `audit_progress` - Stores job progress
   - `audit_page_results` - Stores individual page results
   - Indexes created automatically

2. **Database Connection** - Handled by `@netlify/neon` package

3. **Error Handling** - Automatic fallback to Redis if Neon unavailable

## ✅ Post-Deployment Verification

After deploying, check:

### 1. Function Logs
Go to **Functions → View logs** and look for:
```
✅ Neon PostgreSQL connection initialized
✅ Neon database initialized and tables created
✅ NETLIFY_DATABASE_URL is configured for production (Neon PostgreSQL)
```

### 2. Test Single Page Audit
1. Visit your Netlify URL
2. Enter a test URL (e.g., `example.com`)
3. Click "Audit Page"
4. Verify result appears

### 3. Test Full Site Audit
1. Enter a test URL
2. Click "Audit Full Site"
3. Monitor progress updates
4. Verify final aggregated result appears

### 4. Check Database Tables
1. Go to **Data → Neon** in Netlify Dashboard
2. Click on your database
3. Verify tables exist:
   - `audit_progress`
   - `audit_page_results`

## ⚠️ Common Issues & Solutions

### Issue: "No database storage configured"
**Solution:** 
- Verify `NETLIFY_DATABASE_URL` is set in Netlify Dashboard
- Check it's enabled for Production environment
- Redeploy after setting

### Issue: Function Timeout
**Solution:**
- Upgrade to Netlify Pro ($19/month)
- Batch size is already optimized to 2 pages
- Check function logs for timeout errors

### Issue: Tables Not Created
**Solution:**
- Tables are created on first database access
- Trigger an audit to initialize tables
- Check function logs for initialization errors

### Issue: Connection Errors
**Solution:**
- Verify `NETLIFY_DATABASE_URL` format is correct
- Check Neon database is active
- Review function logs for connection errors

### Issue: Data Not Persisting
**Solution:**
- Verify tables exist (check logs)
- Check expiration times (30 min for progress, 1 hour for results)
- Verify job IDs match between requests

## 📋 Complete Checklist

Before deploying:
- [ ] `ANTHROPIC_API_KEY` set in Netlify Dashboard
- [ ] Neon database linked OR `NETLIFY_DATABASE_URL` set manually
- [ ] `NODE_VERSION` set to `20` (optional)
- [ ] Build settings verified
- [ ] Netlify Pro plan activated (for 26s timeout)

After deploying:
- [ ] Build completed successfully
- [ ] Function logs show Neon initialization
- [ ] Tables created automatically
- [ ] Single page audit works
- [ ] Full site audit works
- [ ] Progress persists across requests
- [ ] Final results appear correctly

## 🎯 Summary

**Minimum Required:**
1. ✅ `ANTHROPIC_API_KEY` in Netlify Dashboard
2. ✅ `NETLIFY_DATABASE_URL` (via Neon link or manual)
3. ✅ Netlify Pro plan (for 26s timeout)

**Everything else is automatic:**
- ✅ Tables created on first use
- ✅ Indexes created automatically
- ✅ Cleanup handled automatically
- ✅ Error handling built-in

---

**Status:** Ready to deploy  
**Next Step:** Set environment variables in Netlify Dashboard and deploy!
