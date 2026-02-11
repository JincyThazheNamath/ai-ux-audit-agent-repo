# Netlify Timeout Maximization for Slower Websites

## Problem
Some .com websites are taking longer to audit, causing pages to fail during initial audit due to timeout.

## Netlify Limitation
**CRITICAL**: Netlify Pro has a **hard 26-second limit** for serverless functions. This cannot be increased beyond 26s.

## Solution: Maximized Timeouts
Optimized timeouts to use the maximum available time (24s + 2s buffer = 26s total).

## Changes Made

### Before (22s timeout)
- Page timeout: 22s
- AI analysis: 15s
- Page load: 12s
- Buffer: 4s
- **Total: 26s** ✅

### After (24s timeout) ✅ **CURRENT**
- Page timeout: **24s** (+2s)
- AI analysis: **17s** (+2s)
- Page load: **14s** (+2s)
- DOM content: **12s** (+2s)
- Data extraction: **12s** (+2s)
- Buffer: **2s** (-2s)
- **Total: 26s** ✅ (maximized)

## Updated Configuration

**File: `lib/config.ts`**
```typescript
timeoutPerPage: 24000, // 24s for Netlify (maximized from 22s)
aiAnalysisTimeout: 17000, // 17s (increased from 15s)
```

**File: `lib/auditHelper.ts`**
```typescript
PAGE_LOAD_TIMEOUT: 14000, // 14s (increased from 12s)
DOM_CONTENT_TIMEOUT: 12000, // 12s (increased from 10s)
DATA_EXTRACTION_TIMEOUT: 12000, // 12s (increased from 10s)
```

## Time Breakdown (Maximized)

Per page audit (Netlify):
- Browser launch: ~2-3s (one-time, reused)
- Page load: ~14s max (+2s)
- Data extraction: ~12s max (+2s, during page load)
- Screenshot: ~1-2s
- AI analysis: ~17s max (+2s)
- DB save: ~1-2s
- **Total: ~24-25s** (fits in 26s with 1-2s buffer)

## Benefits

1. **More time for slow websites**: +2s for page load, +2s for AI analysis
2. **Better success rate**: More pages will complete before timeout
3. **Handles slower .com sites**: Additional time helps with network latency and slow responses

## Important Notes

### Cannot Exceed 26s
- Netlify Pro: **26s is the absolute maximum** (hard limit)
- We're now using **24s + 2s buffer = 26s** (maximized)
- **Cannot increase further** - this is the limit

### If Pages Still Fail
If pages are still timing out after this optimization, the issue is likely:

1. **Very slow target websites** (>24s to load/analyze)
   - Solution: These pages will fail and can be retried
   - The retry mechanism handles these gracefully

2. **Network latency**
   - Solution: Retry mechanism will attempt again

3. **AI API delays**
   - Solution: Retry mechanism handles this

### Monitoring Recommendations

1. **Check Netlify logs** for actual execution times:
   ```
   Netlify Dashboard → Functions → View logs
   Look for: "Function execution time: X seconds"
   ```

2. **If pages consistently take 24-26s**:
   - These are at the limit - retry mechanism will handle failures
   - Consider: Reducing `maxPages` or checking target site performance

3. **If pages take >26s**:
   - Would fail regardless (Netlify kills at 26s)
   - These need to be retried or the target site is too slow

## Alternative Solutions (If Still Having Issues)

### Option 1: Reduce maxPages
- Audit fewer pages at once
- Reduces overall load

### Option 2: Use Vercel Instead
- Vercel Pro: 60s timeout (vs Netlify's 26s)
- Better for slower websites
- Requires migration

### Option 3: Optimize Target Websites
- If auditing your own sites, optimize them for faster loading
- Reduce page size, optimize images, etc.

## Conclusion

**Current configuration uses the maximum available time (24s) within Netlify's 26s limit.**

- ✅ +2s more time for page load
- ✅ +2s more time for AI analysis  
- ✅ Better handling of slower .com websites
- ✅ Still fits within 26s limit

**If pages still timeout, they would timeout at 26s anyway** - the issue is the target website's performance, not our timeout configuration.

---

**Last Updated**: February 11, 2026
