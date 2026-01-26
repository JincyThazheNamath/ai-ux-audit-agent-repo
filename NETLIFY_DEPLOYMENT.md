# Netlify Deployment Guide

## 🚀 Quick Deployment Steps

### Method 1: Deploy via Netlify Dashboard (Recommended)

#### Step 1: Create/Login to Netlify Account
1. Go to: https://app.netlify.com
2. Sign up/Login with GitHub
3. Authorize Netlify to access your repositories

#### Step 2: Import Project
1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Select repository: `ai-ux-audit-agent-repo`
4. Configure build settings:
   - **Base directory:** (leave empty - app is in root)
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
   - **Node version:** `20`

#### Step 3: Configure Environment Variables
1. Go to **Site settings** → **Environment variables**
2. Add the following variables:

   **Required:**
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** Your Anthropic API key (starts with `sk-ant-`)
   - **Scopes:** Production, Deploy previews, Branch deploys

   **Required for Redis:**
   - **Key:** `REDIS_URL`
   - **Value:** `redis://default:aYHlJUvTU2gFuZ1OK9H9IO9fz8fb8WVf@redis-13060.c265.us-east-1-2.ec2.cloud.redislabs.com:13060`
   - **Scopes:** Production, Deploy previews, Branch deploys

3. Click **"Save"** after each variable

#### Step 4: Deploy
1. Click **"Deploy site"**
2. Wait for build to complete (~3-5 minutes)
3. Your app will be live at: `https://your-site-name.netlify.app`

### Method 2: Deploy via Netlify CLI

#### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

#### Step 2: Login to Netlify
```bash
cd "C:\Users\User\OneDrive\Desktop\UX-Audit\ai-ux-audit-agent-repo"
netlify login
```
- This will open browser for authentication

#### Step 3: Initialize Site
```bash
netlify init
```
- Follow prompts:
  - **Create & configure a new site:** Yes
  - **Team:** Select your team
  - **Site name:** (auto-generated or custom)
  - **Build command:** `npm run build`
  - **Directory to deploy:** `.next`
  - **Netlify functions folder:** Leave empty (Next.js handles this)

#### Step 4: Set Environment Variables
```bash
# Set Anthropic API Key
netlify env:set ANTHROPIC_API_KEY "sk-ant-your-key-here"

# Set Redis URL
netlify env:set REDIS_URL "redis://default:aYHlJUvTU2gFuZ1OK9H9IO9fz8fb8WVf@redis-13060.c265.us-east-1-2.ec2.cloud.redislabs.com:13060"
```
- Select environments: Production, Deploy previews, Branch deploys for each

#### Step 5: Deploy
```bash
netlify deploy --prod
```

## ⚙️ Configuration

### `netlify.toml`
Already configured with:
- ✅ Build command: `npm run build`
- ✅ Publish directory: `.next`
- ✅ Node version: 20
- ✅ Security headers
- ✅ API route headers

### Important Notes

#### Function Timeout
- **Netlify Free Tier:** 10 seconds max
- **Netlify Pro:** 26 seconds max
- **Your audit functions:** Need 60-300 seconds

**Solutions:**
1. **Upgrade to Netlify Pro** (for 26s timeout)
2. **Break into smaller functions** (process in chunks)
3. **Use background jobs** (trigger next batch asynchronously)

#### Next.js on Netlify
- Netlify supports Next.js with SSR and API routes
- API routes are automatically converted to Netlify Functions
- Static pages are served from CDN

#### Redis Connection
- Your Redis Labs connection will work on Netlify
- Just set `REDIS_URL` environment variable
- No code changes needed

## 🔧 Differences from Vercel

| Feature | Vercel | Netlify |
|---------|--------|---------|
| Function Timeout (Free) | 10s | 10s |
| Function Timeout (Pro) | 60s | 26s |
| Next.js Support | ✅ Native | ✅ Native |
| Background Jobs | ✅ waitUntil | ⚠️ Limited |
| Redis Support | ✅ Yes | ✅ Yes |

## 📊 Deployment Checklist

- [ ] Netlify account created
- [ ] GitHub repository connected
- [ ] Build command: `npm run build`
- [ ] Publish directory: `.next`
- [ ] Environment variable `ANTHROPIC_API_KEY` set
- [ ] Environment variable `REDIS_URL` set
- [ ] Node version: 20
- [ ] Site deployed successfully
- [ ] Test audit functionality
- [ ] Verify Redis connection

## 🧪 Testing Deployment

1. **Visit Your Site**
   - URL: `https://your-site-name.netlify.app`

2. **Test Single Page Audit**
   - Enter a test URL (e.g., `example.com`)
   - Click "Audit Page"
   - Verify results display correctly

3. **Test Full Site Audit**
   - Enter a test URL
   - Click "Audit Full Site"
   - Monitor progress
   - Verify results appear

4. **Check Function Logs**
   - Netlify Dashboard → Functions → View logs
   - Look for: `✅ ANTHROPIC_API_KEY loaded successfully`
   - Look for: `✅ Redis connected successfully`

## 🔍 Troubleshooting

### Build Fails
- **Check:** Node version is 20
- **Check:** All dependencies are in package.json
- **Check:** Build logs for specific errors

### Function Timeout
- **Issue:** Audit takes longer than 10s (free tier) or 26s (pro)
- **Solution:** Break into smaller batches or upgrade to Pro

### Redis Connection Fails
- **Check:** `REDIS_URL` is set correctly
- **Check:** Redis Labs database is active
- **Check:** Function logs for connection errors

### API Key Not Working
- **Check:** Environment variable is set for correct environment (Production)
- **Check:** API key format is correct (starts with `sk-ant-`)

## 🎉 Success Indicators

After deployment:
- ✅ Site loads at Netlify URL
- ✅ UI displays correctly
- ✅ Single page audit works
- ✅ Full site audit works (may need Pro for long audits)
- ✅ Redis connection successful
- ✅ No build errors
- ✅ Function logs show success

## 📝 Next Steps

1. **Deploy to Netlify** (follow Method 1 or 2 above)
2. **Test thoroughly** with real URLs
3. **Monitor function logs** for any issues
4. **Consider Netlify Pro** if you need longer function timeouts
5. **Set up custom domain** (optional)

---

**Status:** Ready to deploy  
**Estimated Time:** 10-15 minutes  
**Difficulty:** Easy  
**Cost:** Free (Netlify Hobby plan) or $19/month (Pro for longer timeouts)

