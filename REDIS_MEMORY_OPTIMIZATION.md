# Redis Memory Optimization

## Problem
Redis was running out of memory (OOM error) because:
- **Screenshots** (base64-encoded images) are stored in each audit result
- Each screenshot can be **100KB - 2MB+** in size
- Multiple audit jobs accumulate in Redis
- Redis Labs free tier only provides **30MB** of storage

## Error Messages
```
⚠️ Failed to save progress to KV: OOM command not allowed when used memory > 'maxmemory'
Progress saved in memory only - may not persist across serverless invocations
```

## Solutions Implemented

### 1. Exclude Screenshots from Redis Storage ✅
- Screenshots are now **excluded** when saving page results to Redis
- Screenshots are only needed for display, not for aggregation
- This reduces storage by **80-95%** per audit result
- Screenshots are still available in the API response (stored in memory during processing)

### 2. Reduced Expiration Times ✅
- **Progress data**: 30 minutes (was 1 hour)
- **Page results**: 1 hour (was 2 hours)
- Faster cleanup of old data to free memory

### 3. Optimized Final Result Storage ✅
- Screenshots are removed from `finalResult.pageResults` before saving to Redis
- Only essential data (findings, scores, metrics) are stored

### 4. Better Error Handling ✅
- Specific error messages for Redis OOM errors
- Clear guidance on what to do when OOM occurs

### 5. Cleanup Function ✅
- Added `cleanupOldRedisData()` function to remove old completed jobs
- Can be called manually or scheduled

## What This Means

### ✅ Fixed
- Redis memory usage reduced by **80-95%**
- Old data expires faster (30 minutes vs 1 hour)
- Better error messages when Redis is full

### ⚠️ Trade-offs
- Screenshots are not persisted in Redis (only in memory during processing)
- If you need screenshots after processing, they must be stored elsewhere (e.g., S3, Cloudinary)
- Old data expires faster (30 minutes)

## Additional Recommendations

### If You Still Get OOM Errors:

1. **Upgrade Redis Plan** (Recommended)
   - Redis Labs offers paid plans with more storage
   - Go to Redis Labs dashboard → Upgrade subscription
   - Plans start at $5/month for 100MB+

2. **Clean Up Old Data Manually**
   ```typescript
   import { cleanupOldRedisData } from './lib/progressTracker';
   await cleanupOldRedisData();
   ```

3. **Use External Storage for Screenshots**
   - Store screenshots in S3, Cloudinary, or similar
   - Only store screenshot URLs in Redis
   - Requires code changes to upload screenshots

4. **Reduce Audit Frequency**
   - Don't run multiple audits simultaneously
   - Clean up old jobs before starting new ones

## Monitoring Redis Memory

To check Redis memory usage:
1. Go to Redis Labs dashboard
2. Check your database metrics
3. Look for "Memory Used" vs "Memory Limit"

## Code Changes

### Files Modified:
- `lib/progressTracker.ts`
  - `savePageResult()`: Excludes screenshots
  - `saveProgressToKv()`: Optimizes finalResult storage
  - `cleanupOldRedisData()`: New cleanup function

### Key Changes:
```typescript
// Before: Stored full result with screenshot (100KB-2MB+)
await kv.set(kvKey, JSON.stringify(result), { ex: 7200 });

// After: Stores result without screenshot (~5-20KB)
const { screenshot, ...resultWithoutScreenshot } = result;
await kv.set(kvKey, JSON.stringify(resultWithoutScreenshot), { ex: 3600 });
```

## Testing

After deployment, monitor:
1. Redis memory usage (should decrease significantly)
2. Error logs (should see fewer OOM errors)
3. Audit functionality (should work normally, screenshots still available in responses)
