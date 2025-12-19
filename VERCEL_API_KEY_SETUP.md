# Vercel API Key Setup Guide

## Where to Set ANTHROPIC_API_KEY

### ✅ Already Configured:
1. **Local Development** - `.env.local` file
   - Location: `ux-audit-agent/.env.local`
   - Status: ✅ Set

### ⚠️ Needs Configuration:
2. **Vercel Production Deployment** - Environment Variables in Vercel Dashboard

---

## How to Set API Key in Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Find and click on your project: `Automated_UX_Fix` or `ux-audit-agent`

3. **Navigate to Settings**
   - Click on **"Settings"** tab (top navigation)
   - Click on **"Environment Variables"** (left sidebar)

4. **Add Environment Variable**
   - Click **"Add New"** button
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: `sk-ant-api03-...` (your actual API key)
   - **Environment**: Select all three:
     - ✅ Production
     - ✅ Preview
     - ✅ Development

5. **Save**
   - Click **"Save"**
   - The variable will be encrypted and stored securely

6. **Redeploy** (Important!)
   - Go to **"Deployments"** tab
   - Click **"..."** (three dots) on the latest deployment
   - Click **"Redeploy"**
   - Or trigger a new deployment by pushing to GitHub

### Method 2: Via Vercel CLI

```bash
# Navigate to project directory
cd "C:\Users\User\OneDrive\Desktop\VS Projects\CaseStudy\ux-audit-agent"

# Add environment variable
vercel env add ANTHROPIC_API_KEY

# When prompted:
# - Select environments: Production, Preview, Development
# - Paste your API key: sk-ant-api03-...
# - Confirm

# Redeploy to production
vercel --prod
```

---

## Verification Checklist

After setting the API key in Vercel:

- [ ] API key added in Vercel Dashboard → Settings → Environment Variables
- [ ] Key name is exactly: `ANTHROPIC_API_KEY` (case-sensitive)
- [ ] Value starts with: `sk-ant-`
- [ ] Applied to all environments (Production, Preview, Development)
- [ ] Redeployed the application
- [ ] Tested the deployed app with a real URL audit

---

## Testing the Setup

1. **Deploy to Vercel** (if not already deployed)
2. **Visit your deployed URL**: `https://your-project.vercel.app`
3. **Run an audit** on a test website (e.g., `example.com`)
4. **Check Vercel Function Logs**:
   - Go to Vercel Dashboard → Your Project → Functions
   - Click on `app/api/audit/route.ts`
   - Check logs for: `✅ ANTHROPIC_API_KEY loaded successfully`

---

## Troubleshooting

### API Key Not Working in Production

1. **Verify Key Format**
   - Must start with `sk-ant-`
   - No spaces or quotes
   - Full key copied correctly

2. **Check Environment Scope**
   - Ensure key is set for "Production" environment
   - Not just "Preview" or "Development"

3. **Redeploy After Adding Key**
   - Environment variables are only loaded during build
   - Must redeploy after adding/updating variables

4. **Check Vercel Logs**
   - Dashboard → Your Project → Functions → View Logs
   - Look for API key validation messages

### Common Errors

**Error: "ANTHROPIC_API_KEY is not set"**
- Solution: Add key in Vercel Dashboard → Environment Variables → Redeploy

**Error: "401 Authentication failed"**
- Solution: Verify API key is correct and active in Anthropic console

**Error: "404 Model not found"**
- Solution: API key is working, but model name issue (already handled in code)

---

## Security Best Practices

✅ **DO:**
- Use Vercel's encrypted environment variables
- Never commit `.env.local` to Git (already in `.gitignore`)
- Rotate API keys periodically
- Use different keys for dev/prod if needed

❌ **DON'T:**
- Hardcode API keys in source code
- Share API keys in screenshots or documentation
- Commit `.env.local` files to Git

---

## Summary

**Total Places to Set API Key: 2**

1. ✅ **Local**: `.env.local` (Already done)
2. ⚠️ **Vercel**: Dashboard → Settings → Environment Variables (Needs setup)

Once both are set, your app will work in:
- ✅ Local development (`npm run dev`)
- ✅ Vercel production deployment





