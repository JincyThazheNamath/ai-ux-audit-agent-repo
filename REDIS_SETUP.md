# Redis Setup Guide (Following Vercel's Guide)

This guide helps you set up Redis locally to match Vercel's production environment.

## Prerequisites

1. **Connect to your Vercel project**
   ```bash
   cd ai-ux-audit-agent-repo
   vercel link
   ```
   This links your local project to your Vercel project.

2. **Pull environment variables**
   ```bash
   vercel env pull .env.development.local
   ```
   This downloads your environment variables (including `REDIS_URL`) from Vercel to your local `.env.development.local` file.

3. **Install dependencies**
   ```bash
   npm install
   ```
   This installs the `redis` package (already in package.json).

## Redis Package Usage

The project now uses the official `redis` package (v4) as recommended by Vercel, instead of `ioredis`.

### Connection Pattern (Following Vercel's Guide)

```typescript
import { createClient } from 'redis';

// Create client
const redis = createClient({
  url: process.env.REDIS_URL,
});

// Connect (as per Vercel's pattern)
await redis.connect();

// Use Redis
const result = await redis.get("item");
await redis.set("item", "value");
await redis.setEx("item", 3600, "value"); // Set with expiration

// Close connection when done (optional, but good practice)
await redis.quit();
```

## Local Testing

1. **Ensure REDIS_URL is set**
   - Check `.env.development.local` (created by `vercel env pull`)
   - Or set it manually: `REDIS_URL=redis://default:password@host:port`

2. **Run the development server**
   ```bash
   npm run dev
   ```

3. **Test Redis connection**
   - The app will automatically connect to Redis when needed
   - Check console logs for connection status:
     - `✅ Redis connected successfully`
     - `✅ Redis ping successful`

## Production (Vercel)

In Vercel production:
- `REDIS_URL` is automatically available from environment variables
- The Redis client connects on first use
- Connection is reused across serverless function invocations

## Troubleshooting

### Connection Issues

If you see `❌ Failed to connect to Redis`:
1. Verify `REDIS_URL` is set correctly
2. Check Redis server is accessible
3. Verify network/firewall settings
4. Check Redis server logs

### Local vs Production

- **Local**: Uses `.env.development.local` (from `vercel env pull`)
- **Production**: Uses Vercel environment variables (set in Vercel Dashboard)

## Migration from ioredis

The project was migrated from `ioredis` to `redis` package to follow Vercel's official guide. The API is similar but uses:
- `createClient()` instead of `new Redis()`
- `redis.connect()` (async) instead of `redis.connect()` (sync)
- `redis.setEx()` instead of `redis.setex()`
- `redis.isOpen` and `redis.isReady` for connection status

