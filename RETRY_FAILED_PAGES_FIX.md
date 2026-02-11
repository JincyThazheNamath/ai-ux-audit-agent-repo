# Fix: Retried Pages Still Appearing in Failed Pages

## Problem
After successfully retrying failed pages, those URLs were still appearing in the "Failed Pages" section instead of being moved to "Pages by Severity" (sorted pages).

## Root Cause
When aggregating results after retry, the code was:
1. Getting all successful page results (including retried pages) ✅
2. Getting failed pages from progress tracker (including pages that were retried and succeeded) ❌
3. Not filtering out successfully retried pages from the failedPages list ❌

**The Issue:**
```typescript
// OLD CODE - Bug
const failedPages = finalProgress 
    ? finalProgress.pageResults.filter(p => p.status === 'failed') 
    : [];
// This includes pages that were retried and succeeded!
```

## Solution
**File:** `app/api/audit/batch/route.ts`

**Fix:** Exclude URLs from `failedPages` that are in the successful results:

```typescript
// NEW CODE - Fixed
// Get all successful URLs from results
const successfulUrls = new Set(allResults.map(r => r.url));

// Filter failed pages: only include pages that are still failed AND not in successful results
const failedPages = finalProgress 
    ? finalProgress.pageResults.filter(p => {
        const isFailed = p.status === 'failed';
        const wasRetriedAndSucceeded = successfulUrls.has(p.url);
        
        // Only include if failed AND not successfully retried
        if (isFailed && wasRetriedAndSucceeded) {
            console.log(`[Batch] ✅ Excluding ${p.url} from failedPages - was retried and succeeded`);
            return false;
        }
        return isFailed;
    })
    : [];
```

## How It Works

1. **Get successful results**: `allResults` contains all successfully audited pages (including retried ones)
2. **Create URL set**: `successfulUrls` is a Set of all successful page URLs
3. **Filter failed pages**: Only include pages that:
   - Have status 'failed' AND
   - Are NOT in the successful URLs set
4. **Result**: Successfully retried pages are excluded from `failedPages` and appear in `sortedPages` instead

## Expected Behavior After Fix

### Before Fix:
- Retry failed page → Page succeeds
- Page appears in both:
  - ✅ `sortedPages` (correct)
  - ❌ `failedPages` (incorrect - bug)

### After Fix:
- Retry failed page → Page succeeds
- Page appears only in:
  - ✅ `sortedPages` (correct)
  - ✅ Not in `failedPages` (correct - fixed)

## Testing

1. **Start a full-site audit**
2. **Wait for some pages to fail**
3. **Retry the failed pages**
4. **Wait for retry to complete**
5. **Verify**: Successfully retried pages should:
   - ✅ Appear in "Pages by Severity" section
   - ✅ NOT appear in "Failed Pages" section
   - ✅ Have their scores and findings displayed correctly

## Logging

The fix includes logging to help debug:
```
[Batch] ✅ Excluding {url} from failedPages - was retried and succeeded
[Batch] 📊 Failed pages after filtering: X (excluded Y successfully retried pages)
```

## Related Files

- `app/api/audit/batch/route.ts` - Main fix location
- `lib/progressTracker.ts` - Stores page results and status
- `lib/batchAuditor.ts` - Aggregates and sorts results
- `components/SiteOverview.tsx` - Displays failed pages and sorted pages

---

**Fixed:** February 11, 2026
**Issue:** Retried pages appearing in failed pages list
**Status:** ✅ Fixed
