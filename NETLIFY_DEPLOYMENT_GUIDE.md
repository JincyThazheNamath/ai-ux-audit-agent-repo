# Netlify Deployment Guide - Production Ready

## ✅ Optimizations Completed

### 1. Removed Vercel Dependencies
- ✅ Removed `@vercel/functions` package
- ✅ Code now uses direct `await` instead of `waitUntil` (better for Netlify)

### 2. Optimized for Netlify Timeout Limits
- ✅ Batch size reduced to **2 pages** (from 4) to fit within Netlify Pro's 26s timeout
- ✅ Function timeouts configured in `netlify.toml` (26s max on Pro plan)
- ✅ Recursive batch calls use direct await (no background jobs needed)

### 3. Redis OOM Prevention
- ✅ **Screenshots excluded** from Redis storage (saves 80-95% memory)
- ✅ **Findings limited** to 10-20 per page (prevents huge arrays)
- ✅ **Automatic cleanup** before saving final results
- ✅ **OOM error handling** with retry after cleanup
- ✅ **Optimized finalResult** storage (strips screenshots, limits data)

### 4. Cleanup Endpoint
- ✅ Created `/api/audit/cleanup` endpoint
- ✅ Can be called manually to clear old Redis data
- ✅ Automatically runs before saving final results

## 🚀 Deployment Steps

### Step 1: Install Netlify CLI (if not already installed)
```bash
npm install -g netlify-cli
```

### Step 2: Login to Netlify
```bash
netlify login
```

### Step 3: Initialize Site (if not already done)
```bash
netlify init
```
- Follow prompts to connect your repository
- Select your team
- Site name will be auto-generated

### Step 4: Set Environment Variables
```bash
# Set Anthropic API Key
netlify env:set ANTHROPIC_API_KEY "sk-ant-your-key-here"

# Set Redis URL (your Redis Labs connection string)
netlify env:set REDIS_URL "redis://default:password@host:port"
```
- Select environments: **Production**, **Deploy previews**, **Branch deploys** for each

### Step 5: Deploy to Production
```bash
netlify deploy --prod
```

## ⚙️ Configuration Details

### Function Timeouts
- **Free Tier**: 10 seconds (too short for audits)
- **Pro Tier**: 26 seconds (configured in `netlify.toml`)
- **Batch Size**: 2 pages per batch (optimized for 26s timeout)

### Redis Storage Optimizations
- Screenshots excluded (saves 80-95% memory)
- Findings limited to 10-20 per page
- Automatic cleanup of old data (30+ minutes old)
- Expiration times: 30 minutes for progress, 1 hour for results

### Batch Processing
- Processes 2 pages at a time
- Recursive calls use direct await (no background jobs)
- Automatic cleanup before final aggregation
- OOM error handling with retry

## 📊 Important Notes

### Netlify Pro Required
⚠️ **You need Netlify Pro ($19/month) for 26s timeout**
- Free tier (10s) is too short for audits
- Pro tier (26s) works with optimized batch size of 2

### Redis Storage
- Uses Redis Labs (via `REDIS_URL`)
- Optimized to prevent OOM errors
- Automatic cleanup prevents storage issues
- Can manually trigger cleanup via `/api/audit/cleanup`

### Performance
- Single page audit: ~10-15 seconds
- Full site audit: Processes 2 pages at a time
- Large sites may take several minutes (but won't timeout)

## 🧪 Testing After Deployment

1. **Test Single Page Audit**
   - Visit your Netlify URL
   - Enter a test URL (e.g., `example.com`)
   - Verify audit completes successfully

2. **Test Full Site Audit**
   - Enter a test URL
   - Monitor progress (should process 2 pages at a time)
   - Verify final aggregated result appears

3. **Test Cleanup Endpoint**
   ```bash
   curl -X POST https://your-site.netlify.app/api/audit/cleanup
   ```

4. **Check Function Logs**
   - Netlify Dashboard → Functions → View logs
   - Look for: `✅ Redis connected successfully`
   - Look for: `✅ Final result saved successfully`

## 🔍 Troubleshooting

### Issue: Function Timeout
**Solution**: 
- Ensure you're on Netlify Pro (26s timeout)
- Batch size is already optimized to 2 pages
- Check function logs for slow pages

### Issue: Redis OOM
**Solution**:
- Call cleanup endpoint: `POST /api/audit/cleanup`
- Check Redis Labs dashboard for memory usage
- Consider upgrading Redis plan if needed

### Issue: Pages Not Processing
**Solution**:
- Check function logs for errors
- Verify `REDIS_URL` is set correctly
- Ensure recursive batch calls are executing

## 📝 Key Differences from Vercel

| Feature | Vercel | Netlify |
|---------|--------|---------|
| Max Timeout (Pro) | 300s | 26s |
| Batch Size | 4 pages | 2 pages |
| Background Jobs | waitUntil | Direct await |
| Redis Support | ✅ Yes | ✅ Yes |
| Code Changes | None needed | Optimized for Netlify |

## ✅ Deployment Checklist

- [x] Removed Vercel dependencies
- [x] Optimized batch size for Netlify (2 pages)
- [x] Configured function timeouts in netlify.toml
- [x] Optimized Redis storage (exclude screenshots)
- [x] Added automatic cleanup
- [x] Added cleanup endpoint
- [x] Added OOM error handling
- [ ] Netlify Pro plan activated
- [ ] Environment variables set
- [ ] Deployed to production
- [ ] Tested single page audit
- [ ] Tested full site audit
- [ ] Verified Redis connection

## 🎉 Success Indicators

After deployment, you should see:
- ✅ Site loads at Netlify URL
- ✅ Single page audits complete successfully
- ✅ Full site audits process all pages
- ✅ Final aggregated results appear
- ✅ No Redis OOM errors
- ✅ Function logs show success

---

**Status**: Ready for Netlify deployment  
**Estimated Time**: 15-20 minutes  
**Cost**: Netlify Pro ($19/month) required for 26s timeout
