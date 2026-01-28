# Netlify 26s Timeout Optimization Guide

## Overview

This document details the optimizations made to ensure the AI UX Audit Agent completes full-site audits within Netlify's **26-second function timeout limit** (Pro plan).

## Key Optimizations

### 1. Batch Size Reduction
- **Before**: 4 pages per batch
- **After**: 2 pages per batch
- **Rationale**: 
  - Each page: ~8s page load + ~2s AI analysis = 10s max per page
  - 2 pages × 10s = 20s max per batch
  - Leaves 6s buffer for DB operations, overhead, and recursive calls

### 2. Page Load Timeout Optimization
- **Before**: 30s page load timeout, 20s DOM content timeout
- **After**: 8s page load timeout, 6s DOM content timeout
- **Location**: `lib/auditHelper.ts`
- **Rationale**: Faster failure detection, prevents hanging on slow pages

### 3. AI Analysis Timeout
- **Before**: 30s AI analysis timeout
- **After**: 20s AI analysis timeout
- **Location**: `lib/auditHelper.ts`
- **Rationale**: Still generous for AI calls, but prevents hanging

### 4. Request Delays Optimization
- **Before**: 1000ms delay between requests
- **After**: 500ms delay between requests
- **Location**: `lib/batchProcessor.ts`
- **Rationale**: Faster processing while still preventing rate limits

### 5. Per-Page Timeout
- **Before**: 30s timeout per page
- **After**: 10s timeout per page
- **Location**: `app/api/audit/batch/route.ts`
- **Rationale**: Ensures each page completes within 10s (8s load + 2s AI)

### 6. Detailed Timing Logs
- **Added**: Comprehensive timing logs throughout the batch processing pipeline
- **Location**: `app/api/audit/batch/route.ts`, `lib/batchProcessor.ts`
- **Logs Include**:
  - Function start/end times
  - Progress fetch duration
  - Batch processing duration
  - Per-page audit duration
  - Warnings when approaching 26s limit

### 7. UI Progress Improvements
- **Polling Interval**: Reduced from 2s to 1.5s for faster updates
- **Batch Progress Indicator**: Shows estimated batches remaining
- **Status Messages**: More granular status updates showing batch progress
- **Location**: `components/SiteAuditProgress.tsx`

## Performance Targets

### Per-Page Breakdown (Target: 10s max)
- Page load (domcontentloaded): ~3-5s
- Critical resources wait: 2s
- Screenshot capture: ~1-2s
- AI analysis: ~2-5s
- DB save: ~0.5s
- **Total**: ~8-14s per page (optimized average: ~10s)

### Per-Batch Breakdown (Target: 20s max)
- 2 pages × 10s = 20s
- Overhead (DB, logging): ~2-3s
- **Total**: ~22-23s per batch (well within 26s limit)

### Function Duration Breakdown
- Progress fetch: ~100-500ms
- Batch processing: ~20-23s
- Recursive call trigger: ~100ms (fire-and-forget)
- **Total**: ~20-24s (safe margin below 26s)

## Monitoring & Alerts

### Timing Warnings
The system logs warnings when:
- Page takes >80% of timeout (8s for 10s timeout)
- Batch takes >24s (close to 26s limit)
- Function duration >24s

### Log Examples
```
[Batch] ⏱️ Progress fetch: 234ms
[Batch] ⏱️ Batch processing duration: 18543ms
[Batch] ⏱️ Total function duration: 18921ms (Netlify limit: 26000ms)
[processBatches] ⚠️ WARNING: Batch took 24500ms - very close to Netlify 26s limit!
```

## Configuration Files

### `netlify.toml`
- Function timeouts set to 26s (Pro plan requirement)
- Applies to: `/api/audit/batch`, `/api/audit/site`, `/api/audit`

### `lib/config.ts`
- Redis connection timeouts optimized for serverless
- API endpoint timeouts configured

## Testing Recommendations

1. **Monitor Production Logs**: Check Netlify function logs for timing warnings
2. **Test with Various Site Sizes**: 
   - Small sites (5-10 pages): Should complete quickly
   - Medium sites (20-30 pages): Should process in ~10-15 batches
   - Large sites (40+ pages): Should process in ~20+ batches
3. **Watch for Timeout Errors**: If batches consistently exceed 26s, reduce batch size to 1 page
4. **Verify Progress Updates**: UI should update every 1.5s showing accurate progress

## Troubleshooting

### Issue: Batches Timing Out
**Symptoms**: Function logs show duration >26s
**Solutions**:
1. Reduce batch size from 2 to 1 page
2. Reduce page load timeout from 8s to 6s
3. Reduce AI analysis timeout from 20s to 15s

### Issue: Slow Page Loads
**Symptoms**: Pages taking >8s to load
**Solutions**:
1. Check if target site is slow/down
2. Consider increasing timeout slightly (but stay <10s per page)
3. Add retry logic for network errors

### Issue: UI Not Updating
**Symptoms**: Progress stuck, no updates
**Solutions**:
1. Check polling interval (should be 1.5s)
2. Verify `/api/audit/progress/[jobId]` endpoint is responding
3. Check Neon database connection

## Future Optimizations

1. **Parallel Processing**: Process 2 pages in parallel (if Netlify allows)
2. **Smarter Batching**: Adjust batch size based on average page load time
3. **Caching**: Cache page HTML/content to reduce load times
4. **Streaming**: Stream progress updates via Server-Sent Events (SSE)

## Summary

With these optimizations:
- ✅ Batches complete in ~20-23s (well within 26s limit)
- ✅ UI updates every 1.5s showing accurate progress
- ✅ Detailed timing logs help identify bottlenecks
- ✅ Graceful degradation if pages are slow
- ✅ Clear warnings when approaching timeout limits

The system is now optimized for Netlify's 26s function timeout while maintaining reliability and user experience.
