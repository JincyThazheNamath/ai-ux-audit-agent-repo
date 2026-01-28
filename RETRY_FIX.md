# Retry Failed Pages Fix

## Issue
Retrying failed audit pages was always failing because the `/api/audit/site` route was ignoring the `retryUrls` parameter and performing normal page discovery instead of directly auditing the failed URLs.

## Root Cause
The `handleRetryFailedPages` function in `app/page.tsx` sends `retryUrls` to `/api/audit/site`, but the route handler was not checking for this parameter and always executed the discovery phase.

## Solution
Modified `/api/audit/site/route.ts` to:

1. **Extract `retryUrls` parameter** from the request body
2. **Check if `retryUrls` is provided** - if yes, skip discovery phase
3. **Use provided URLs directly** - set them as pending pages in the progress tracker
4. **Skip to auditing phase** - immediately trigger batch processing with the retry URLs
5. **Update status messages** - show "Retrying X failed pages..." instead of "Found X pages..."

## Changes Made

### `app/api/audit/site/route.ts`

1. **Added `retryUrls` parameter extraction**:
   ```typescript
   const { url, maxPages = 40, maxDepth = 3, useMockData = false, retryUrls } = await request.json();
   ```

2. **Updated initial progress tracker** to handle retry mode:
   ```typescript
   const initialPageCount = retryUrls && Array.isArray(retryUrls) && retryUrls.length > 0 
     ? retryUrls.length 
     : 1;
   ```

3. **Added retry mode detection** in background processing:
   ```typescript
   if (retryUrls && Array.isArray(retryUrls) && retryUrls.length > 0) {
     // Retry mode: Skip discovery and use provided URLs directly
     pageUrls = retryUrls;
     actualPageCount = retryUrls.length;
     await updateStatus(jobId, 'auditing', `Retrying ${actualPageCount} failed pages...`);
   } else {
     // Normal mode: Discover pages
     // ... discovery logic ...
   }
   ```

4. **Updated status message** to reflect retry mode:
   ```typescript
   const statusMessage = retryUrls && Array.isArray(retryUrls) && retryUrls.length > 0
     ? `Retrying ${actualPageCount} failed pages, starting audit...`
     : `Found ${actualPageCount} pages, starting audit...`;
   ```

## How It Works Now

1. **User clicks "Retry"** on a failed page in `SiteOverview` component
2. **`handleRetryFailedPages`** is called with the failed URL(s)
3. **POST request** is sent to `/api/audit/site` with:
   - `url`: Base URL (first failed URL)
   - `retryUrls`: Array of failed URLs to retry
4. **Route handler** detects `retryUrls` parameter
5. **Skips discovery** and uses `retryUrls` directly
6. **Creates progress tracker** with retry URLs as pending pages
7. **Triggers batch processing** immediately
8. **Batch processor** audits the retry URLs normally

## Testing

To test the fix:

1. Run a full-site audit that results in some failed pages
2. Click "Retry" on a failed page
3. Verify:
   - No discovery phase occurs
   - Status shows "Retrying X failed pages..."
   - Batch processing starts immediately
   - Failed pages are audited successfully

## Benefits

- ✅ **Faster retries** - No discovery overhead
- ✅ **Direct processing** - Failed URLs are audited immediately
- ✅ **Better UX** - Clear status messages for retry mode
- ✅ **Efficient** - Only processes the failed pages, not the entire site
