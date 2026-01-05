# Deploy to Vercel - Quick Guide

## Method 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel**: Visit https://vercel.com and sign in with your GitHub account

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Select your repository: `JincyThazheNamath/Automated_UX_Fix`
   - Click "Import"

3. **Configure Project**:
   - **Root Directory**: Set to `ux-audit-agent`
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

4. **Environment Variables** (Optional):
   - Since we're using mock data, no environment variables are needed
   - If you want to use real API later, add: `ANTHROPIC_API_KEY`

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project-name.vercel.app`

## Method 2: Deploy via Vercel CLI

1. **Login to Vercel**:
   ```bash
   cd ux-audit-agent
   vercel login
   ```
   - This will open a browser for authentication

2. **Deploy**:
   ```bash
   vercel --yes
   ```
   - Follow the prompts
   - Select default settings

3. **Production Deploy**:
   ```bash
   vercel --prod
   ```

## Project Configuration

- ✅ `vercel.json` is configured with 60s timeout for API routes
- ✅ `.gitignore` excludes sensitive files
- ✅ Next.js 16 with App Router
- ✅ TypeScript configured
- ✅ Tailwind CSS configured

## Notes

- The project uses **mock data** by default, so no API keys are required
- All findings are generated locally
- The app is fully functional without external dependencies
- Build time: ~2-3 minutes
- Deployment is free on Vercel's Hobby plan

## Troubleshooting

If build fails:
- Check Node.js version (should be 18+)
- Verify all dependencies in `package.json`
- Check Vercel build logs for errors

If you need to add environment variables later:
- Go to Project Settings → Environment Variables
- Add `ANTHROPIC_API_KEY` if switching to real API









