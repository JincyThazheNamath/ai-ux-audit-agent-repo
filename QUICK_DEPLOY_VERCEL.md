# ⚡ Quick Deploy to Vercel - 3 Steps

## Step 1: Commit & Push Changes
```bash
cd "C:\Users\User\OneDrive\Desktop\VS Projects\CaseStudy\ux-audit-agent"
git add .
git commit -m "feat: Optimize application and prepare for Vercel deployment"
git push origin main
```

## Step 2: Configure Vercel Dashboard

1. **Go to:** https://vercel.com/dashboard
2. **Click:** `ux-audit-agent` project
3. **Settings → General:**
   - ✅ Root Directory: `ux-audit-agent`
4. **Settings → Environment Variables:**
   - ✅ `ANTHROPIC_API_KEY` = your API key

## Step 3: Deploy

1. **Go to:** Deployments tab
2. **Click:** "Redeploy" on latest deployment
   - OR wait for auto-deploy (if GitHub connected)

**Your prototype will be live at:** `https://ux-audit-agent-*.vercel.app`

---

**Full guide:** See `DEPLOY_TO_VERCEL_PROTOTYPE.md` for detailed instructions.


