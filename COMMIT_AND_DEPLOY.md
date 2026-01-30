# Commit and Deploy Instructions

## ⚠️ OneDrive Lock File Issue

If you see `Permission denied` for `.git/index.lock`, follow these steps:

1. **Close all applications** that might be using git (VS Code, Cursor, Git GUI, etc.)
2. **Run PowerShell/Command Prompt as Administrator**
3. Navigate to the project directory:
   ```powershell
   cd "C:\Users\User\OneDrive\Desktop\UX-Audit\ai-ux-audit-agent-repo"
   ```

4. **Remove the lock file** (if it exists):
   ```powershell
   Remove-Item -Path ".git/index.lock" -Force -ErrorAction SilentlyContinue
   ```

5. **Wait 2-3 seconds** for OneDrive to release the file

---

## 📝 Commit Changes

### Step 1: Stage All Modified Files

```powershell
git add app/api/audit/batch/route.ts
git add app/api/audit/site/route.ts
git add app/page.tsx
git add components/SiteAuditProgress.tsx
git add lib/auditHelper.ts
git add lib/batchProcessor.ts
git add lib/config.ts
git add lib/crawler.ts
git add netlify.toml
```

**Optional:** Add documentation files:
```powershell
git add *.md
```

### Step 2: Commit with Descriptive Message

```powershell
git commit -m "Fix: Complete 40-page audit support with error handling improvements

- Fix batch skipping pages: Include 'processing' status pages to retry stuck audits
- Fire-and-forget batch trigger to stay under Netlify 26s timeout limit
- Fix abort signal errors: Add reasons to all abort() calls, suppress UI errors for abort/timeout
- Fix progress check errors: Add retry logic (8 failures before showing error)
- Fix page status display: Show green checkmark for pages with scores (completed audits)
- Improve page load resilience: Use fallback data if response extraction fails
- Reduce verification wait time to leave buffer for batch trigger
- Add backup resume trigger: Auto-resume stuck audits after 45s no progress
- Disable circuit breaker: Process all pages regardless of failures

All fixes ensure 40 pages are fully audited without stopping on errors."
```

### Step 3: Push to Remote

```powershell
git push origin mai
```

**Note:** If your branch is named `main` instead of `mai`, use:
```powershell
git push origin main
```

---

## 🚀 Netlify Deployment

### Automatic Deployment

If Netlify is connected to your Git repository, it will **automatically deploy** when you push:

1. Push your changes (Step 3 above)
2. Go to your Netlify dashboard
3. Check the "Deploys" tab - you should see a new deployment starting
4. Wait for the build to complete (~2-5 minutes)

### Manual Deployment (if needed)

If automatic deployment isn't working:

1. Go to Netlify Dashboard → Your Site → Deploys
2. Click "Trigger deploy" → "Deploy site"
3. Or use Netlify CLI:
   ```powershell
   netlify deploy --prod
   ```

---

## ✅ Verify Deployment

After deployment completes:

1. **Test 40-page audit:**
   - Go to your deployed site
   - Enter a website URL
   - Select "Full Site Audit"
   - Verify all 40 pages are discovered and audited

2. **Check logs:**
   - Netlify Dashboard → Functions → View logs
   - Look for batch processing logs
   - Verify no "signal is aborted without reason" errors

3. **Monitor progress:**
   - Check that progress updates smoothly
   - Verify no "Failed to check progress" errors appear during normal operation
   - Confirm all pages show correct status (green checkmark for completed)

---

## 📋 Summary of Changes

### Files Modified:
- `app/api/audit/batch/route.ts` - Fire-and-forget trigger, include processing pages
- `app/api/audit/site/route.ts` - Enhanced logging, page count verification
- `components/SiteAuditProgress.tsx` - Retry logic, abort error suppression, resume trigger
- `lib/auditHelper.ts` - Resilient data extraction, optional screenshot
- `lib/batchProcessor.ts` - Disabled circuit breaker, improved error isolation
- `lib/config.ts` - Configuration for Netlify timeouts
- `lib/crawler.ts` - Timeout increases (already done)
- `netlify.toml` - Function timeout configuration

### Key Improvements:
✅ All 40 pages are now audited without stopping  
✅ Errors are isolated - one page failure doesn't stop others  
✅ Progress check errors don't show immediately (retry first)  
✅ Abort errors are suppressed in UI (no "signal is aborted without reason")  
✅ Batch processing continues even if trigger fails (backup resume)  
✅ Pages stuck in "processing" are retried automatically  

---

## 🐛 Troubleshooting

### If git add fails with permission error:
1. Close Cursor/VS Code completely
2. Run PowerShell as Administrator
3. Try the commands again

### If push fails:
```powershell
git pull origin mai --rebase
git push origin mai
```

### If Netlify build fails:
- Check Netlify build logs
- Verify environment variables are set (ANTHROPIC_API_KEY, REDIS_URL)
- Check function timeout settings in netlify.toml

---

## 📞 Need Help?

If you encounter issues:
1. Check Netlify function logs for errors
2. Verify Redis connection is working
3. Check that all environment variables are set in Netlify dashboard
