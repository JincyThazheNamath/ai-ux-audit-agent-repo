# Netlify Timeout Optimization

## Problem
In Netlify environment, some pages were failing during audit and the retry API was always failing due to timeout issues.

## Root Cause
Netlify Pro has a **26-second maximum timeout** for serverless functions. The previous configuration was:
- Page timeout: 20s
- AI analysis timeout: 20s  
- Total: ~40s+ (exceeds 26s limit)

This caused pages to timeout and the retry API to fail.

## Solutions Implemented

### 1. Optimized Timeouts for Netlify
**File: `lib/config.ts`**
- **Page timeout**: Reduced from 20s to **18s** for Netlify (20s elsewhere)
- **AI analysis timeout**: Reduced from 20s to **12s** for Netlify (20s elsewhere)
- **Total per page**: ~18s max, leaving **8s buffer** for Netlify overhead

**File: `lib/auditHelper.ts`**
- **Page load timeout**: Reduced from 12s to **10s** for Netlify (12s elsewhere)
- **DOM content timeout**: Reduced from 10s to **8s** for Netlify (10s elsewhere)
- **Data extraction timeout**: Reduced from 15s to **8s** for Netlify (15s elsewhere)

### 2. Retry API Optimization
**File: `app/api/audit/retry/route.ts`**
- **Batch updates**: Changed from sequential `await` to parallel `Promise.all()` for faster execution
- **Fire-and-forget**: Batch trigger now runs asynchronously without blocking the response
- **Immediate response**: API returns immediately after updating status, allowing batch processing to continue in background
- **Retry logic**: Added automatic retry for batch trigger if initial attempt fails

### 3. Netlify Configuration
**File: `netlify.toml`**
- Added timeout configuration for retry route: **26s** (same as other routes)
- All API routes now have explicit 26s timeout configured

## Time Breakdown (Netlify)

Per page audit:
- Browser launch: ~2-3s (one-time, reused)
- Page load: ~10s max
- Data extraction: ~8s max (during page load)
- Screenshot: ~1-2s
- AI analysis: ~12s max
- DB save: ~1-2s
- **Total: ~24-25s** (fits comfortably in 26s limit)

## Benefits

1. **Reduced Timeouts**: Pages are less likely to timeout during audit
2. **Faster Retry API**: Retry API completes quickly and doesn't timeout
3. **Better Success Rate**: More pages complete successfully on first attempt
4. **Efficient Processing**: Parallel updates reduce database call overhead

## Testing Recommendations

1. **Monitor Netlify Logs**: Check function execution times in Netlify dashboard
2. **Watch for Timeouts**: If pages still timeout, consider:
   - Reducing `maxPages` in site audit (fewer pages = less load)
   - Checking if target website is slow to respond
   - Verifying Netlify Pro plan is active (26s timeout requires Pro)

3. **Retry API**: Test retry functionality:
   - Start a full-site audit
   - Wait for some pages to fail
   - Use retry API to retry failed pages
   - Verify retry completes successfully

## Environment Detection

The code automatically detects Netlify environment using:
```typescript
const isNetlify = !!process.env.NETLIFY;
```

Timeouts are automatically adjusted based on environment:
- **Netlify**: Optimized shorter timeouts (18s page, 12s AI)
- **Vercel/Other**: Standard timeouts (20s page, 20s AI)

## Notes

- **Netlify Free Tier**: Has 10s timeout limit (not sufficient for audits)
- **Netlify Pro**: Required for 26s timeout (recommended)
- **Page Processing**: One page at a time (not in batches) to fit within timeout
- **Background Processing**: Batch API triggers itself recursively to continue processing

---

**Last Updated**: February 11, 2026
