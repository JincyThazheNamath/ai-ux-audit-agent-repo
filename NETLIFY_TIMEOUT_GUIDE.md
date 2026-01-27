# How to Increase Netlify Function Timeout

## Current Configuration

Your `netlify.toml` is already configured with the maximum timeout for Netlify Pro:

```toml
[functions."app/api/audit/batch/route.ts"]
  timeout = 26  # Max timeout on Pro plan

[functions."app/api/audit/site/route.ts"]
  timeout = 26  # Max timeout on Pro plan

[functions."app/api/audit/route.ts"]
  timeout = 26  # Max timeout on Pro plan
```

## Netlify Timeout Limits by Plan

| Plan | Maximum Timeout | Cost |
|------|----------------|------|
| **Free/Hobby** | 10 seconds | Free |
| **Pro** | 26 seconds | $19/month |
| **Business** | 26 seconds | $99/month |
| **Enterprise** | 26 seconds | Custom pricing |

⚠️ **Important:** 26 seconds is the **maximum** timeout for all Netlify plans, including Enterprise.

## Why You Can't Increase Beyond 26s

Netlify Functions are built on AWS Lambda, which has a hard limit of 26 seconds for serverless functions. This is a platform limitation, not a Netlify-specific restriction.

## Options to Work Around the 26s Limit

### Option 1: Optimize Your Code (Recommended)

Since you can't increase the timeout beyond 26s, optimize your code to work within it:

1. **Reduce Batch Size** (Already done - 2 pages per batch)
2. **Process Faster** - Optimize Puppeteer and AI calls
3. **Use Background Jobs** - Trigger next batch asynchronously (already implemented)

### Option 2: Break Into Smaller Functions

Instead of one long-running function, break it into multiple smaller functions:

```typescript
// Function 1: Start audit (5s)
// Function 2: Process batch 1 (20s)
// Function 3: Process batch 2 (20s)
// Function 4: Aggregate results (10s)
```

### Option 3: Use Netlify Background Functions

Netlify Background Functions can run longer, but they:
- Don't return responses to the client
- Must be triggered asynchronously
- Have different pricing

### Option 4: Use External Queue System

Use an external service for long-running tasks:
- **AWS SQS** - Queue messages for processing
- **BullMQ** - Redis-based job queue
- **Inngest** - Background job service
- **Trigger.dev** - Background jobs for serverless

### Option 5: Switch to Different Platform

If you need longer timeouts:
- **Vercel Pro**: 60 seconds max ($20/month)
- **AWS Lambda**: 15 minutes max (pay per use)
- **Google Cloud Functions**: 60 minutes max (pay per use)
- **Railway/Render**: No timeout limits (pay per use)

## Current Optimization Strategy

Your code is already optimized for Netlify's 26s limit:

1. ✅ **Small Batches**: 2 pages per batch
2. ✅ **Recursive Calls**: Next batch triggered asynchronously
3. ✅ **Fast Processing**: Optimized Puppeteer and AI calls
4. ✅ **Timeout Handling**: Proper error handling for timeouts

## How to Verify Current Timeout

1. Go to **Netlify Dashboard** → Your Site
2. Go to **Functions** tab
3. Click on a function (e.g., `/api/audit/batch`)
4. Check **Settings** → **Timeout** should show **26 seconds**

## If You Need Longer Timeouts

### Recommended: Use Background Jobs

Modify your code to use Netlify Background Functions or an external queue:

```typescript
// Example: Using external queue (BullMQ)
import Queue from 'bull';

const auditQueue = new Queue('audit', {
  redis: { host: 'your-redis-url' }
});

// Add job to queue (no timeout limit)
await auditQueue.add('process-batch', { jobId, urls });
```

### Alternative: Use Vercel

Vercel Pro offers 60-second timeouts:
- Better for long-running audits
- Similar pricing ($20/month)
- Better Next.js integration

## Summary

- **Current Limit**: 26 seconds (already configured)
- **Cannot Increase**: This is a platform maximum
- **Best Solution**: Optimize code + use background jobs
- **Alternative**: Switch to Vercel (60s) or AWS Lambda (15min)

---

**Status**: Already at maximum (26s)  
**Recommendation**: Keep current optimization, consider background jobs if needed
