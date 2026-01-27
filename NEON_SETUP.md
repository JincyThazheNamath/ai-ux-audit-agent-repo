# Neon Database Setup for Netlify

## Overview

This application now uses **Neon PostgreSQL** (via `@netlify/neon`) for persistent storage instead of Redis. Neon is automatically configured when you deploy to Netlify.

## How It Works

1. **Automatic Detection**: The app automatically detects `NETLIFY_DATABASE_URL` environment variable
2. **Database Tables**: Tables are created automatically on first use
3. **Redis Compatibility**: Provides Redis-like interface for easy migration

## Setup Steps

### Step 1: Create Neon Database in Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Data** → **Neon**
3. Click **"Create Database"** or **"Link Database"**
4. Follow the prompts to create/link a Neon database
5. Netlify will automatically set `NETLIFY_DATABASE_URL` environment variable

### Step 2: Verify Environment Variable

The `NETLIFY_DATABASE_URL` should be automatically set by Netlify. To verify:

1. Go to **Site settings** → **Environment variables**
2. Look for `NETLIFY_DATABASE_URL`
3. It should be automatically available (you don't need to set it manually)

### Step 3: Deploy

Deploy your site - the database tables will be created automatically on first use.

## Database Schema

The following tables are created automatically:

### `audit_progress`
Stores overall audit job progress:
- `job_id` (VARCHAR, PRIMARY KEY)
- `progress_data` (JSONB) - Full progress object
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP) - For automatic cleanup

### `audit_page_results`
Stores individual page audit results:
- `id` (SERIAL, PRIMARY KEY)
- `job_id` (VARCHAR) - Links to audit_progress
- `page_url` (TEXT) - The audited page URL
- `result_data` (JSONB) - Full audit result
- `created_at` (TIMESTAMP)
- `expires_at` (TIMESTAMP) - For automatic cleanup

## Migration from Redis

The code automatically detects which storage to use:
1. **First Priority**: Neon (`NETLIFY_DATABASE_URL`)
2. **Fallback**: Redis (`REDIS_URL`)

If both are set, Neon takes precedence.

## Benefits of Neon

- ✅ **No OOM Errors**: PostgreSQL handles large data better than Redis
- ✅ **Structured Storage**: JSONB columns for efficient querying
- ✅ **Automatic Cleanup**: Expired records are automatically removed
- ✅ **Better Performance**: Indexed queries for faster lookups
- ✅ **Netlify Integration**: Seamless integration with Netlify

## Code Changes

### Before (Redis):
```typescript
await kv.set(key, value, { ex: 3600 });
const data = await kv.get(key);
```

### After (Neon):
```typescript
// Same interface - works automatically!
await kv.set(key, value, { ex: 3600 });
const data = await kv.get(key);
```

The code uses the same interface, so no changes needed in your application code.

## Troubleshooting

### Issue: Tables Not Created
**Solution**: The tables are created on first database access. Make sure:
- `NETLIFY_DATABASE_URL` is set
- Database is accessible from Netlify functions
- Check function logs for initialization errors

### Issue: Connection Errors
**Solution**: 
- Verify `NETLIFY_DATABASE_URL` is set correctly
- Check Neon database is active
- Review function logs for connection errors

### Issue: Data Not Persisting
**Solution**:
- Verify tables exist: Check function logs for "✅ Neon database initialized"
- Check expiration times: Data expires after configured time
- Verify job IDs match between requests

## Environment Variables

### Required:
- `NETLIFY_DATABASE_URL` - Automatically set by Netlify when Neon database is linked

### Optional (Fallback):
- `REDIS_URL` - Used if Neon is not available

## Cleanup

Expired records are automatically cleaned up:
- Progress records expire after 30 minutes
- Page results expire after 1 hour
- Manual cleanup via `/api/audit/cleanup` endpoint

## Performance

- **Indexes**: Created automatically for `job_id` and `expires_at`
- **Queries**: Optimized for common access patterns
- **Storage**: JSONB for efficient storage and querying

---

**Status**: Ready to use  
**Auto-created**: Tables are created automatically  
**Migration**: Automatic fallback to Redis if Neon not available
