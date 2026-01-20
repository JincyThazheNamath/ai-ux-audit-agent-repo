# Full-Site Audit Setup Guide

## Current Status
✅ Infrastructure is ready for real audits
- Batch processor implemented
- Progress tracking working
- Page discovery implemented
- Single-page audit helper ready

## Next Steps to Enable Real Audits

### Step 1: Verify Environment Variables

Ensure your `.env.local` file has:

```env
# Required: Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional: Chrome Path (if Chrome is not in standard location)
CHROME_PATH=C:\Path\To\Chrome\chrome.exe

# IMPORTANT: Do NOT set this (or set to false) for real audits
# USE_MOCK_DATA=false
```

**Check if mock data mode is disabled:**
- Remove `USE_MOCK_DATA=true` from `.env.local` OR
- Set `USE_MOCK_DATA=false` OR
- Don't include it at all (defaults to real audits)

### Step 2: Test with a Small Website First

**Recommended test sites:**
1. **Simple static site** (3-5 pages)
   - Example: A portfolio site or landing page
   - URL: `https://example.com` (replace with actual small site)

2. **Test configuration:**
   - `maxPages: 5` (start small)
   - `maxDepth: 2` (shallow crawl)
   - Monitor the first run carefully

### Step 3: Monitor First Real Audit

**Watch for:**
1. **Browser launch errors**
   - Check if Chrome is installed
   - Verify Chrome path if using custom location

2. **Timeout issues**
   - Current timeout: 30 seconds per page
   - Adjust in `lib/batchProcessor.ts` if needed

3. **Rate limiting**
   - Current: 200ms delay between requests
   - Current: 1000ms delay between batches
   - Increase if hitting API limits

4. **Memory/Performance**
   - Current batch size: 8 pages
   - Reduce if experiencing memory issues

### Step 4: Optimize Configuration

**If experiencing issues, adjust these values in `app/api/audit/site/route.ts`:**

```typescript
{
  batchSize: 5,              // Reduce if memory issues (default: 8)
  delayBetweenBatches: 2000, // Increase if rate limiting (default: 1000ms)
  delayBetweenRequests: 500, // Increase if rate limiting (default: 200ms)
  maxRetries: 3,             // Increase retries (default: 2)
  timeoutPerPage: 60000,     // Increase timeout (default: 30000ms / 30s)
}
```

### Step 5: Production Considerations

**For production deployment (Vercel/serverless):**

1. **Serverless Timeouts**
   - Vercel Pro: 60 seconds max
   - Vercel Enterprise: 300 seconds max
   - **Solution**: Use background jobs/queue system for large sites

2. **Memory Limits**
   - Vercel: 1GB memory (Hobby), 3GB (Pro)
   - Reduce batch size if hitting limits

3. **API Rate Limits**
   - Anthropic API has rate limits
   - Add exponential backoff if needed
   - Consider queuing system for large audits

4. **Cost Management**
   - Each page = 1 API call to Anthropic
   - Monitor API usage
   - Consider caching results

### Step 6: Testing Checklist

- [ ] `.env.local` configured with `ANTHROPIC_API_KEY`
- [ ] `USE_MOCK_DATA` is NOT set (or set to `false`)
- [ ] Chrome/Chromium is installed (or `CHROME_PATH` is set)
- [ ] Test with small website (3-5 pages)
- [ ] Monitor server console for errors
- [ ] Verify progress tracking works
- [ ] Check audit results are real (not mock)
- [ ] Test with medium website (10-20 pages)
- [ ] Monitor performance and optimize if needed

### Step 7: Troubleshooting

**If audits are still using mock data:**

1. Check `.env.local` doesn't have `USE_MOCK_DATA=true`
2. Restart dev server after changing env vars
3. Check server logs for "Using mock data mode"
4. Verify `auditSinglePage` function is being called

**If browser launch fails:**

1. Install Google Chrome
2. Set `CHROME_PATH` in `.env.local`
3. Check file permissions

**If timeouts occur:**

1. Increase `timeoutPerPage` in batch config
2. Reduce `batchSize` to process fewer pages at once
3. Check network connectivity
4. Verify target website is accessible

**If API rate limits hit:**

1. Increase `delayBetweenRequests`
2. Increase `delayBetweenBatches`
3. Reduce `batchSize`
4. Check Anthropic API dashboard for limits

## Current Implementation Status

✅ **Ready:**
- Real audit infrastructure
- Batch processing
- Progress tracking
- Error handling with retries
- Mock data fallback (if all audits fail)

⚠️ **Needs Testing:**
- Real audit execution with actual websites
- Performance under load
- Rate limit handling
- Large site handling (40+ pages)

## Quick Start Command

```bash
# 1. Ensure .env.local has ANTHROPIC_API_KEY
# 2. Make sure USE_MOCK_DATA is NOT set
# 3. Start dev server
npm run dev

# 4. Test with small site via UI:
#    - Select "Full Site Audit"
#    - Enter URL: https://example.com
#    - Click "Audit Website"
#    - Monitor progress
```

## Files to Review

- `app/api/audit/site/route.ts` - Main audit orchestration
- `lib/auditHelper.ts` - Single-page audit logic
- `lib/batchProcessor.ts` - Batch processing logic
- `lib/progressTracker.ts` - Progress tracking
- `lib/crawler.ts` - Page discovery




