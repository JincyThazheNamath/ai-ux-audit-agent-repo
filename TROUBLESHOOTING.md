# Troubleshooting Full-Site Audit

## Common Issues and Solutions

### 1. Audits Failing - Browser Launch Errors

**Symptoms:**
- All pages fail to audit
- Error: "Chromium executable path is null" or "Browser launch failed"

**Solutions:**

#### For Local Development (Windows):
1. **Install Google Chrome** if not already installed
2. **Set CHROME_PATH environment variable** in `.env.local`:
   ```
   CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
   ```
3. **Or use mock data mode** for testing:
   - Add to `.env.local`: `USE_MOCK_DATA=true`
   - Or pass `useMockData: true` in the API request

#### For Production (Vercel):
- Ensure `@sparticuz/chromium` is properly installed
- Check Vercel build logs for Chromium installation errors

### 2. Audits Failing - Page Load Timeouts

**Symptoms:**
- Pages timeout after 30 seconds
- Error: "Timeout: Page took longer than 30000ms"

**Solutions:**
1. **Check if URLs are accessible** - Some pages may be slow or blocked
2. **Increase timeout** (in `lib/batchProcessor.ts`):
   ```typescript
   timeoutPerPage: 60000, // 60 seconds instead of 30
   ```
3. **Reduce batch size** to process fewer pages in parallel:
   ```typescript
   batchSize: 4, // Instead of 8
   ```

### 3. Audits Failing - AI API Errors

**Symptoms:**
- Error: "Failed to find a valid model" or "Authentication failed"

**Solutions:**
1. **Check ANTHROPIC_API_KEY** in `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```
2. **Verify API key is valid** at https://console.anthropic.com/
3. **Check API rate limits** - You may be hitting rate limits
4. **Use mock data mode** if API issues persist

### 4. No Pages Discovered

**Symptoms:**
- Audit completes but shows 0 pages
- Error: "No pages were successfully audited"

**Solutions:**
1. **Check if website has sitemap.xml** - The crawler tries sitemap first
2. **Verify website is accessible** - Some sites block crawlers
3. **Increase maxDepth** to crawl deeper:
   ```typescript
   maxDepth: 5, // Instead of 3
   ```
4. **Check robots.txt** - Some sites block crawling

### 5. Progress API Returns 404

**Symptoms:**
- Progress polling fails with 404
- "Job not found" error

**Solutions:**
1. **Check server logs** for job creation
2. **Verify jobId matches** between creation and polling
3. **Wait a moment** - Job might still be initializing
4. **Check if server restarted** - In-memory store is cleared on restart

## Testing with Mock Data

To test the full-site audit without real audits:

### Option 1: Environment Variable
Add to `.env.local`:
```
USE_MOCK_DATA=true
```

### Option 2: API Request Parameter
```json
{
  "url": "example.com",
  "useMockData": true
}
```

### Option 3: Automatic Fallback
If all real audits fail, the system automatically falls back to mock data.

## Debugging Steps

1. **Check Server Logs:**
   - Look for "✅ Job created" message
   - Check for "🔍 Starting audit for" messages
   - Look for error messages with stack traces

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Check Network tab for API calls
   - Look for error messages

3. **Test Progress Tracker:**
   - Visit: `http://localhost:3000/api/audit/progress/test`
   - This shows all jobs in the progress store

4. **Test Single Page Audit:**
   - Try single page audit first
   - If that works, the issue is with batch processing
   - If that fails, check browser/API configuration

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Chromium executable path is null" | Chrome not found | Install Chrome or set CHROME_PATH |
| "Failed to load page" | URL not accessible | Check URL is valid and accessible |
| "Timeout: Page took longer than..." | Page too slow | Increase timeout or skip slow pages |
| "Failed to find a valid model" | AI API issue | Check ANTHROPIC_API_KEY |
| "Job not found" | Progress tracker issue | Check server logs, verify jobId |
| "No pages were successfully audited" | All audits failed | Check error logs, use mock data fallback |

## Performance Tips

1. **Start Small:** Test with 5-10 pages first
2. **Use Mock Data:** For development/testing
3. **Monitor Logs:** Watch server logs for errors
4. **Check Rate Limits:** Don't exceed API rate limits
5. **Batch Size:** Reduce if getting timeouts





