# Testing Checklist - Development & Production

## ✅ Code Review Completed

### Fixed Issues:
1. ✅ **Neon Key Pattern Matching**: Fixed `dbKeys` to properly handle `audit:progress:*` pattern
2. ✅ **Cleanup Function**: Fixed `dbCleanup` to properly count deleted records using CTE
3. ✅ **Environment Detection**: Added Netlify environment detection alongside Vercel
4. ✅ **Error Messages**: Updated to mention both Neon and Redis options
5. ✅ **Build Phase Detection**: Added Netlify check to allow initialization during build

## Testing Scenarios

### Development Environment

#### Test 1: No Database (In-Memory Only)
- [ ] Start dev server: `npm run dev`
- [ ] Check console logs - should show: `⚠️ Storage not configured in development`
- [ ] Create a single page audit
- [ ] Verify audit completes successfully
- [ ] Check that progress is stored in memory
- [ ] Restart dev server
- [ ] Verify progress is lost (expected - in-memory only)

#### Test 2: With Redis (REDIS_URL)
- [ ] Set `REDIS_URL` in `.env.local`
- [ ] Start dev server: `npm run dev`
- [ ] Check console logs - should show: `✅ Using Redis (REDIS_URL)`
- [ ] Create a full site audit
- [ ] Verify progress persists across page refreshes
- [ ] Check Redis connection logs
- [ ] Verify all pages are processed
- [ ] Verify final result is saved

#### Test 3: With Neon (NETLIFY_DATABASE_URL)
- [ ] Set `NETLIFY_DATABASE_URL` in `.env.local`
- [ ] Start dev server: `npm run dev`
- [ ] Check console logs - should show: `✅ Using Neon PostgreSQL (NETLIFY_DATABASE_URL)`
- [ ] Check logs for: `✅ Neon database initialized and tables created`
- [ ] Create a full site audit
- [ ] Verify progress persists across page refreshes
- [ ] Check database tables exist
- [ ] Verify all pages are processed
- [ ] Verify final result is saved

#### Test 4: Both Neon and Redis (Neon Priority)
- [ ] Set both `NETLIFY_DATABASE_URL` and `REDIS_URL` in `.env.local`
- [ ] Start dev server: `npm run dev`
- [ ] Check console logs - should show: `✅ Using Neon PostgreSQL`
- [ ] Verify Neon is used (not Redis)
- [ ] Create audit and verify it works

### Production Environment (Netlify)

#### Test 5: Neon Database (Production)
- [ ] Deploy to Netlify with `NETLIFY_DATABASE_URL` set
- [ ] Check function logs for: `✅ Neon PostgreSQL connection initialized`
- [ ] Check function logs for: `✅ Neon database initialized and tables created`
- [ ] Create a single page audit
- [ ] Verify audit completes successfully
- [ ] Create a full site audit
- [ ] Monitor progress updates
- [ ] Verify all pages are processed
- [ ] Verify final aggregated result appears
- [ ] Check database tables in Neon dashboard

#### Test 6: Redis Fallback (Production)
- [ ] Deploy to Netlify with `REDIS_URL` set (no Neon)
- [ ] Check function logs for: `✅ Redis Labs connection initialized`
- [ ] Create a full site audit
- [ ] Verify progress persists
- [ ] Verify all pages are processed

#### Test 7: No Storage (Production - Should Warn)
- [ ] Deploy to Netlify without `NETLIFY_DATABASE_URL` or `REDIS_URL`
- [ ] Check function logs for: `❌ CRITICAL: No database storage configured`
- [ ] Create audit - should work but warn about persistence

### API Endpoints Testing

#### Test 8: Single Page Audit (`/api/audit`)
- [ ] POST to `/api/audit` with URL
- [ ] Verify response includes audit result
- [ ] Verify screenshot is included in response
- [ ] Check that result is NOT saved to storage (single page audits don't need persistence)

#### Test 9: Full Site Audit (`/api/audit/site`)
- [ ] POST to `/api/audit/site` with URL
- [ ] Verify jobId is returned
- [ ] Verify status is 'discovering' initially
- [ ] Check that progress is saved to storage
- [ ] Poll `/api/audit/progress/[jobId]`
- [ ] Verify status changes: discovering → auditing → aggregating → completed
- [ ] Verify pageResults array updates
- [ ] Verify finalResult appears when completed

#### Test 10: Progress Endpoint (`/api/audit/progress/[jobId]`)
- [ ] GET `/api/audit/progress/[jobId]` for existing job
- [ ] Verify progress data is returned
- [ ] GET `/api/audit/progress/[jobId]` for non-existent job
- [ ] Verify 404 response

#### Test 11: Batch Processing (`/api/audit/batch`)
- [ ] Trigger batch processing via site audit
- [ ] Check function logs for batch processing
- [ ] Verify recursive batch calls work
- [ ] Verify aggregation completes
- [ ] Verify final result is saved

#### Test 12: Cleanup Endpoint (`/api/audit/cleanup`)
- [ ] POST `/api/audit/cleanup`
- [ ] Verify cleanup runs successfully
- [ ] Check logs for cleanup count
- [ ] Verify expired records are deleted

### Edge Cases

#### Test 13: Large Audit (Many Pages)
- [ ] Create audit for site with 20+ pages
- [ ] Verify all pages are processed
- [ ] Verify no timeout errors
- [ ] Verify final result includes all pages
- [ ] Check storage size (should be optimized)

#### Test 14: Failed Pages
- [ ] Create audit for site with inaccessible pages
- [ ] Verify failed pages are tracked
- [ ] Verify audit still completes
- [ ] Verify failed pages are in finalResult.failedPages

#### Test 15: Expired Data
- [ ] Create audit and wait 30+ minutes
- [ ] Try to access progress
- [ ] Verify expired data is cleaned up
- [ ] Verify cleanup endpoint removes expired records

#### Test 16: Concurrent Audits
- [ ] Start multiple audits simultaneously
- [ ] Verify each has unique jobId
- [ ] Verify progress tracking works for all
- [ ] Verify no data corruption

### Error Handling

#### Test 17: Database Connection Failure
- [ ] Set invalid `NETLIFY_DATABASE_URL`
- [ ] Start dev server
- [ ] Verify error is logged but app doesn't crash
- [ ] Verify fallback to in-memory storage

#### Test 18: Redis Connection Failure
- [ ] Set invalid `REDIS_URL`
- [ ] Start dev server
- [ ] Verify error is logged but app doesn't crash
- [ ] Verify fallback to in-memory storage

#### Test 19: Storage Write Failure
- [ ] Fill up storage (if possible)
- [ ] Try to save progress
- [ ] Verify error is handled gracefully
- [ ] Verify progress still saved in memory

## Expected Behaviors

### Development:
- ✅ Works with or without database
- ✅ Falls back to in-memory storage if database unavailable
- ✅ Clear error messages if database fails
- ✅ Tables created automatically on first use (Neon)

### Production:
- ✅ Warns if no storage configured
- ✅ Uses Neon if available (preferred)
- ✅ Falls back to Redis if Neon unavailable
- ✅ Handles connection errors gracefully
- ✅ Automatic cleanup of expired data

## Performance Checks

- [ ] Single page audit completes in < 15 seconds
- [ ] Full site audit processes 2 pages per batch (Netlify timeout)
- [ ] Progress updates are fast (< 100ms)
- [ ] Database queries are optimized (indexes used)
- [ ] No memory leaks during long audits

## Security Checks

- [ ] Environment variables not exposed in client code
- [ ] Database credentials secure
- [ ] SQL injection prevented (parameterized queries)
- [ ] Job IDs are validated

---

**Status**: Ready for testing  
**Priority**: Test Neon functionality first (new feature)  
**Fallback**: Redis should still work if Neon unavailable
