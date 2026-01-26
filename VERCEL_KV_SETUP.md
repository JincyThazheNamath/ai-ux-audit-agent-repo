# Redis Setup Guide (Redis Labs)

## Problem
In Vercel's serverless environment, in-memory storage doesn't persist across different function invocations. When `/api/audit/site` creates a job and `/api/audit/progress/[jobId]` tries to retrieve it, they might run on different serverless instances, causing 404 errors.

## Solution: Redis Labs (External Redis Service)

This application uses **Redis Labs** (external Redis service) for persistent storage that works across all serverless function invocations. Redis Labs provides a managed Redis service that can be accessed from anywhere.

## Setup Steps

### 1. Create Redis Labs Account and Database

1. Go to [Redis Labs](https://redis.com/try-free/) (formerly Redis Cloud)
2. Sign up for a free account or log in
3. Create a new database:
   - Click **"Create Database"** or **"New Subscription"**
   - Choose **"Free"** tier (30MB storage, perfect for development)
   - Select a region (choose closest to your Vercel deployment region)
   - Click **"Create"**

### 2. Get Connection String (REDIS_URL)

After creating the database:

1. Go to your database dashboard
2. Click on your database name
3. Find the **"Connect"** or **"Configuration"** section
4. Copy the **Redis connection string** (REDIS_URL)
   - Format: `redis://default:password@host:port`
   - Example: `redis://default:abc123xyz@redis-12345.c1.us-east-1-1.ec2.cloud.redislabs.com:12345`

**Important**: The connection string includes:
- Protocol: `redis://`
- Username: `default` (or your custom username)
- Password: Your database password
- Host: Your Redis host address
- Port: Your Redis port (usually 12345 or similar)

### 3. Add Environment Variable to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `ai-ux-audit-agent-repo`
3. Go to **Settings** → **Environment Variables**
4. Click **"Add New"**
5. Add the following:
   - **Key:** `REDIS_URL`
   - **Value:** (paste your Redis Labs connection string from step 2)
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development
6. Click **"Save"**

### 4. Verify Environment Variable

After adding the environment variable:

1. Go to **Settings** → **Environment Variables**
2. Verify `REDIS_URL` is listed
3. Check that it's enabled for all environments (Production, Preview, Development)

### 5. Redeploy

After adding the environment variable, you need to redeploy:

**Option A: Via Vercel Dashboard**
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Or trigger a new deployment by pushing to your repository

**Option B: Via CLI**
```bash
vercel --prod
```

## Verification

After deployment, check the build logs. You should see:
```
✅ Redis connected successfully
✅ Redis ping successful
🔍 Attempting to initialize Redis Labs connection...
   REDIS_URL present: true
   Using REDIS_URL for persistent storage
```

Instead of:
```
❌ CRITICAL: REDIS_URL is not configured in production!
⚠️ REDIS_URL is not set
```

## How It Works

- **With Redis:** Progress is stored in Redis Labs and persists across all serverless function invocations
- **Without Redis:** Progress is stored in memory and may be lost between function invocations (causes 404 errors)

## Cost

Redis Labs Free Tier:
- **Storage:** 30 MB
- **Connections:** 30
- **Operations:** Unlimited (with rate limits)
- **Perfect for:** Development and small production workloads

For audit progress tracking, the free tier should be more than sufficient.

## Alternative: Vercel KV

If you prefer to use Vercel's managed Redis service instead:

1. Go to Vercel Dashboard → **Storage** → **Create Database**
2. Select **KV** (Redis)
3. This will provide `KV_REST_API_URL` and `KV_REST_API_TOKEN`
4. **Note:** The current codebase uses `REDIS_URL` (Redis Labs), not Vercel KV. To use Vercel KV, you would need to modify `lib/progressTracker.ts` to support both options.

## Troubleshooting

### Issue: "REDIS_URL is not configured"
**Solution:** 
- Verify `REDIS_URL` is set in Vercel Environment Variables
- Make sure it's enabled for Production environment
- Redeploy after adding the variable

### Issue: "Failed to initialize Redis"
**Solution:**
- Check that your Redis Labs database is active
- Verify the connection string format is correct
- Ensure your Redis database allows connections from Vercel's IP ranges
- Check Redis Labs dashboard for connection logs

### Issue: "Connection timeout"
**Solution:**
- Verify your Redis database is in the same region as your Vercel deployment
- Check Redis Labs dashboard for database status
- Ensure your database hasn't exceeded the free tier limits

## Security Notes

- **Never commit `REDIS_URL` to git** - it contains your password
- Always use Vercel Environment Variables for sensitive data
- The `.env.local` file is gitignored and safe for local development
- For production, always use Vercel's Environment Variables

## Local Development

For local development, create a `.env.local` file in the project root:

```env
REDIS_URL=redis://default:password@host:port
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

The application will automatically use this for local development.

---

**For production reliability, Redis Labs (via REDIS_URL) is required.**
