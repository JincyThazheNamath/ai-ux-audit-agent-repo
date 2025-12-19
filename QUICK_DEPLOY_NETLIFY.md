# Quick Deploy to Netlify - 5 Minutes

## 🚀 Fast Track Deployment

### Option 1: One-Command Deploy (CLI)

```bash
cd "C:\Users\User\OneDrive\Desktop\VS Projects\CaseStudy\ux-audit-agent"
netlify login
netlify init
netlify env:set ANTHROPIC_API_KEY "sk-ant-your-key-here"
netlify deploy --prod
```

### Option 2: Dashboard Deploy (Easiest)

1. **Go to:** https://app.netlify.com
2. **Click:** "Add new site" → "Import an existing project"
3. **Connect:** GitHub → Select `Automated_UX_Fix`
4. **Configure:**
   - Base directory: `ux-audit-agent`
   - Build command: `npm run build`
   - Publish directory: `.next`
5. **Environment Variables:**
   - Add `ANTHROPIC_API_KEY` = your key
6. **Deploy:** Click "Deploy site"

## ✅ That's It!

Your prototype will be live at: `https://your-site.netlify.app`

---

**Full guide:** See `DEPLOY_NETLIFY.md` for detailed instructions.





