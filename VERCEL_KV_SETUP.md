# Vercel KV Setup Guide

## Problem
In Vercel's serverless environment, in-memory storage doesn't persist across different function invocations. When `/api/audit/site` creates a job and `/api/audit/progress/[jobId]` tries to retrieve it, they might run on different serverless instances, causing 404 errors.

## Solution: Vercel KV (Redis)

Vercel KV provides persistent storage that works across all serverless function invocations.

## Setup Steps

### 1. Create Vercel KV Database

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `ai-ux-audit-agent-repo`
3. Go to **Storage** tab
4. Click **Create Database**
5. Select **KV** (Redis)
6. Choose a name (e.g., `audit-progress-kv`)
7. Select a region (choose closest to your users)
8. Click **Create**

### 2. Get Connection Details

After creating the KV database:
1. Go to the **Storage** tab
2. Click on your KV database
3. Go to **.env.local** tab
4. Copy the environment variables:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

### 3. Add Environment Variables to Vercel

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add the following:
   - **Key:** `KV_REST_API_URL`
   - **Value:** (paste from step 2)
   - **Environments:** Production, Preview, Development
   
4. Add:
   - **Key:** `KV_REST_API_TOKEN`
   - **Value:** (paste from step 2)
   - **Environments:** Production, Preview, Development

### 4. Redeploy

After adding environment variables:
```bash
vercel --prod
```

Or trigger a new deployment from the Vercel dashboard.

## Verification

After deployment, check the build logs. You should see:
```
✅ Vercel KV initialized for persistent storage
```

Instead of:
```
⚠️ Vercel KV env vars not set (KV_REST_API_URL, KV_REST_API_TOKEN)
```

## How It Works

- **With KV:** Progress is stored in Redis and persists across all serverless function invocations
- **Without KV:** Progress is stored in memory and may be lost between function invocations (causes 404 errors)

## Cost

Vercel KV has a free tier:
- **Free:** 256 MB storage, 30,000 reads/day, 30,000 writes/day
- **Pro:** $0.20/GB storage, $0.20 per 1M reads, $0.20 per 1M writes

For audit progress tracking, the free tier should be more than sufficient.

## Alternative: Quick Fix (Without KV)

If you don't want to set up KV right now, the code will still work but may have issues with 404 errors in production. The system will:
1. Try to use KV if available
2. Fall back to in-memory storage if KV is not configured
3. Work better if requests hit the same function instance (warm functions)

For production reliability, **Vercel KV is recommended**.



