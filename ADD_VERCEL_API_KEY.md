# Quick Guide: Add API Key to Vercel

## Current Status
- ✅ Vercel CLI installed (v48.12.1)
- ✅ Logged in as: `jincythazhenamath`
- ✅ Project linked: `ux-audit-agent` (ID: prj_0XtoNo0GK7dYdaq7aZksPajMDiSy)
- ⚠️ API Key needs to be added

## Method 1: Vercel Dashboard (Easiest - Recommended)

1. **Open Vercel Dashboard**
   - Go to: https://vercel.com/dashboard
   - Sign in if needed

2. **Select Your Project**
   - Click on: **`ux-audit-agent`**

3. **Go to Settings**
   - Click **"Settings"** tab (top navigation)
   - Click **"Environment Variables"** (left sidebar)

4. **Add New Variable**
   - Click **"Add New"** button
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: Paste your API key (from `.env.local`)
   - **Environments**: Select all three:
     - ☑️ Production
     - ☑️ Preview  
     - ☑️ Development
   - Click **"Save"**

5. **Redeploy**
   - Go to **"Deployments"** tab
   - Click **"..."** (three dots) on latest deployment
   - Click **"Redeploy"**
   - Or push a new commit to trigger deployment

## Method 2: Vercel CLI (Alternative)

If the interactive prompt is still open, complete it:

1. **Mark as sensitive?** → Type `y` and press Enter
2. **Select environments** → Use arrow keys + space to select:
   - Production
   - Preview
   - Development
   - Press Enter to confirm
3. **Enter API key** → Paste your key and press Enter

If you need to start fresh:

```powershell
cd "C:\Users\User\OneDrive\Desktop\VS Projects\CaseStudy\ux-audit-agent"
vercel env add ANTHROPIC_API_KEY
```

Then follow the prompts above.

## After Adding the Key

### Verify It's Set:
```powershell
vercel env ls
```

You should see `ANTHROPIC_API_KEY` listed.

### Redeploy:
```powershell
vercel --prod
```

Or trigger via GitHub push.

## Testing

1. Visit your deployed URL: `https://ux-audit-agent.vercel.app` (or your custom domain)
2. Run an audit on a test website
3. Check Vercel logs:
   - Dashboard → Project → Functions → `app/api/audit/route.ts` → View Logs
   - Look for: `✅ ANTHROPIC_API_KEY loaded successfully`

## Troubleshooting

**Key not working?**
- Verify key format: Must start with `sk-ant-`
- Check environment scope: Must include "Production"
- Redeploy after adding (variables load during build)

**Need to update the key?**
- Dashboard: Settings → Environment Variables → Edit → Update value → Save → Redeploy
- CLI: `vercel env rm ANTHROPIC_API_KEY` then `vercel env add ANTHROPIC_API_KEY`

## Security Note

✅ Your API key is encrypted in Vercel
✅ Never commit `.env.local` to Git (already in `.gitignore`)
✅ Vercel environment variables are secure and encrypted





