# Professional CTO Guide: Deploy to Netlify

## 🎯 Overview

This guide provides step-by-step instructions to deploy the UX Audit Agent to Netlify as a production prototype.

## 📋 Prerequisites

- ✅ Netlify CLI installed (`npm install -g netlify-cli`)
- ✅ GitHub repository: `JincyThazheNamath/Automated_UX_Fix`
- ✅ Netlify account (free tier works)
- ✅ Anthropic API key

## 🚀 Deployment Methods

### Method 1: Deploy via Netlify Dashboard (Recommended)

#### Step 1: Create Netlify Account
1. Go to: https://app.netlify.com
2. Sign up/Login with GitHub
3. Authorize Netlify to access your repositories

#### Step 2: Import Project
1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Select repository: `Automated_UX_Fix`
4. Configure build settings:
   - **Base directory:** `ux-audit-agent`
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
   - **Node version:** `20`

#### Step 3: Configure Environment Variables
1. Go to **Site settings** → **Environment variables**
2. Add:
   - **Key:** `ANTHROPIC_API_KEY`
   - **Value:** Your API key (starts with `sk-ant-`)
   - **Scopes:** Production, Deploy previews, Branch deploys
3. Click **"Save"**

#### Step 4: Deploy
1. Click **"Deploy site"**
2. Wait for build to complete (~2-3 minutes)
3. Your app will be live at: `https://your-site-name.netlify.app`

### Method 2: Deploy via Netlify CLI

#### Step 1: Login to Netlify
```bash
cd "C:\Users\User\OneDrive\Desktop\VS Projects\CaseStudy\ux-audit-agent"
netlify login
```
- This will open browser for authentication

#### Step 2: Initialize Site
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

#### Step 3: Set Environment Variables
```bash
netlify env:set ANTHROPIC_API_KEY "sk-ant-your-key-here"
```
- Select environments: Production, Deploy previews, Branch deploys

#### Step 4: Deploy
```bash
netlify deploy --prod
```

## ⚙️ Configuration Files

### `netlify.toml`
Already created with:
- ✅ Base directory: `ux-audit-agent`
- ✅ Build command: `npm run build`
- ✅ Node version: 20
- ✅ Function timeout: 60 seconds
- ✅ Security headers

## 🔧 Important Notes

### Next.js on Netlify

Netlify supports Next.js with:
- **Server-side rendering (SSR)**
- **API routes** (as serverless functions)
- **Static site generation (SSG)**

### Puppeteer on Netlify

**Challenge:** Puppeteer requires Chromium, which can be large for serverless functions.

**Solutions:**
1. **Use @sparticuz/chromium** (optimized for serverless):
   ```bash
   npm install @sparticuz/chromium puppeteer-core
   ```

2. **Update API route** to use:
   ```typescript
   import chromium from '@sparticuz/chromium';
   import puppeteer from 'puppeteer-core';
   
   const browser = await puppeteer.launch({
     args: chromium.args,
     defaultViewport: chromium.defaultViewport,
     executablePath: await chromium.executablePath(),
     headless: chromium.headless,
   });
   ```

### Function Timeout

- **Default:** 10 seconds (Hobby plan)
- **Required:** 60 seconds for audit API
- **Solution:** Configured in `netlify.toml` with 60s timeout

## 📊 Deployment Checklist

- [ ] Netlify account created
- [ ] GitHub repository connected
- [ ] Base directory set to: `ux-audit-agent`
- [ ] Build command: `npm run build`
- [ ] Publish directory: `.next`
- [ ] Environment variable `ANTHROPIC_API_KEY` set
- [ ] Node version: 20
- [ ] Site deployed successfully
- [ ] Test audit functionality
- [ ] Verify API key is working

## 🧪 Testing Deployment

1. **Visit Your Site**
   - URL: `https://your-site-name.netlify.app`

2. **Test Audit**
   - Enter a test URL (e.g., `example.com`)
   - Click "Run Audit"
   - Verify results display correctly

3. **Check Function Logs**
   - Netlify Dashboard → Functions → View logs
   - Look for: `✅ ANTHROPIC_API_KEY loaded successfully`

## 🔍 Troubleshooting

### Build Fails: "Couldn't find app directory"
- **Solution:** Verify base directory is set to `ux-audit-agent` in Netlify settings

### Function Timeout
- **Solution:** Ensure timeout is set to 60s in `netlify.toml`

### Puppeteer Errors
- **Solution:** Install `@sparticuz/chromium` and update API route

### API Key Not Working
- **Solution:** Verify environment variable is set for correct environment (Production)

## 📈 Comparison: Netlify vs Vercel

| Feature | Netlify | Vercel |
|---------|---------|--------|
| Next.js Support | ✅ Excellent | ✅ Excellent |
| Function Timeout | 10s (free), 26s (pro) | 10s (free), 60s (pro) |
| Base Directory | ✅ Supported | ✅ Supported |
| Build Time | ~2-3 min | ~1-2 min |
| Free Tier | Generous | Generous |

## 🎉 Success Indicators

After deployment:
- ✅ Site loads at Netlify URL
- ✅ UI displays correctly
- ✅ Audit functionality works
- ✅ API calls succeed
- ✅ No build errors
- ✅ Function logs show success

## 📝 Next Steps

1. **Deploy to Netlify** (follow Method 1 or 2 above)
2. **Test thoroughly** with real URLs
3. **Monitor function logs** for any issues
4. **Share prototype URL** with stakeholders

---

**Status:** Ready to deploy  
**Estimated Time:** 10-15 minutes  
**Difficulty:** Easy  
**Cost:** Free (Netlify Hobby plan)





