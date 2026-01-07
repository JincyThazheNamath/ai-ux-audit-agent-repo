# Deployment Guide - AI UX Audit Agent

## Prerequisites

1. **Anthropic API Key**
   - Sign up at https://console.anthropic.com/
   - Create an API key
   - Copy the key for use in environment variables

2. **GitHub Account** (for version control and Vercel integration)

3. **Vercel Account** (free tier works)

## Local Development Setup

1. **Clone and Install**
```bash
cd ux-audit-agent
npm install
```

2. **Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

3. **Run Development Server**
```bash
npm run dev
```

4. **Test Locally**
   - Open http://localhost:3000
   - Enter a test URL (e.g., `example.com`)
   - Verify the audit works

## Vercel Deployment

### Option 1: Deploy via Vercel Dashboard

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   - In Vercel project settings → Environment Variables
   - Add: `ANTHROPIC_API_KEY` = `your_api_key_here`
   - Apply to Production, Preview, and Development

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
```bash
npm i -g vercel
```

2. **Login**
```bash
vercel login
```

3. **Deploy**
```bash
cd ux-audit-agent
vercel
```

4. **Set Environment Variables**
```bash
vercel env add ANTHROPIC_API_KEY
# Paste your API key when prompted
```

5. **Redeploy**
```bash
vercel --prod
```

## Important Notes

### Puppeteer in Serverless Environments

Puppeteer requires Chromium, which can be large for serverless functions. Vercel has a 50MB limit for serverless functions.

**If you encounter size issues:**

1. **Use @sparticuz/chromium** (optimized for AWS Lambda/Vercel):
```bash
npm install @sparticuz/chromium puppeteer-core
```

2. **Update the API route** to use:
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

3. **Update vercel.json**:
```json
{
  "functions": {
    "app/api/audit/route.ts": {
      "maxDuration": 60,
      "memory": 3008
    }
  }
}
```

### Function Timeout

The audit process can take 30-60 seconds. Vercel's default timeout is 10 seconds for Hobby plan.

**Solution**: The `vercel.json` file already configures 60-second timeout. For production, consider:
- Vercel Pro plan (up to 300 seconds)
- Or implement queue system with background jobs

### API Rate Limits

Anthropic API has rate limits:
- Free tier: Limited requests
- Paid tier: Higher limits

Monitor usage in Anthropic dashboard.

## Testing Deployment

1. **Test Basic Functionality**
   - Visit deployed URL
   - Enter a simple website (e.g., `example.com`)
   - Verify audit completes

2. **Test Error Handling**
   - Try invalid URL
   - Try unreachable URL
   - Verify error messages display

3. **Check Logs**
   - Vercel Dashboard → Functions → View logs
   - Check for any runtime errors

## Troubleshooting

### Build Fails
- Check Node.js version (should be 18+)
- Verify all dependencies installed
- Check for TypeScript errors

### Function Timeout
- Increase timeout in vercel.json
- Optimize Puppeteer (reduce screenshot size)
- Consider caching results

### Puppeteer Errors
- Switch to @sparticuz/chromium
- Increase function memory allocation
- Check Vercel function logs

### API Errors
- Verify ANTHROPIC_API_KEY is set correctly
- Check API key permissions
- Verify API quota not exceeded

## Production Checklist

- [ ] Environment variables configured
- [ ] API key has sufficient quota
- [ ] Build succeeds locally
- [ ] Deployment succeeds on Vercel
- [ ] Test audit works on deployed site
- [ ] Error handling works correctly
- [ ] UI is responsive on mobile
- [ ] README updated with deployment URL

## Cost Estimates

**Vercel (Hobby Plan - Free)**
- 100GB bandwidth/month
- Unlimited deployments
- Sufficient for MVP/demo

**Anthropic API**
- Pay-per-use pricing
- ~$0.01-0.03 per audit (depending on page complexity)
- Free tier available for testing

## Support

For issues:
1. Check Vercel function logs
2. Check Anthropic API dashboard
3. Review GitHub issues
4. Test locally first













