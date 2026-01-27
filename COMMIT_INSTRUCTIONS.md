# How to Commit Changes (OneDrive Lock Issue)

## Quick Fix: Use VS Code/Cursor Source Control Panel

Since OneDrive is locking the git index file, use the built-in git UI:

### Steps:

1. **Open Source Control Panel**
   - Press `Ctrl+Shift+G` OR
   - Click the Source Control icon in the left sidebar (looks like a branch)

2. **Stage All Changes**
   - Click the "+" button next to "Changes" to stage all files
   - OR click "+" next to individual files to stage selectively

3. **Commit**
   - Type commit message in the text box at the top:
     ```
     feat: Add Next.js 15 compatibility and troubleshooting improvements
     ```
   - Press `Ctrl+Enter` OR click the checkmark (✓) button

4. **Push (if needed)**
   - Click the "..." menu (three dots) in Source Control panel
   - Select "Push" to push to remote repository

## Files Ready to Commit:

### Modified Files (15):
- `.gitignore`
- `package.json`
- `app/api/audit/progress/[jobId]/route.ts` (Next.js 15 compatibility)
- `lib/config.ts`
- Documentation files (various .md files)

### New Files (5):
- `NEXTJS_15_COMPATIBILITY.md`
- `TROUBLESHOOTING_EPERM.md`
- `start-dev.ps1`
- `NETLIFY_DEPLOYMENT.md`
- `NETLIFY_QUICK_DEPLOY.md`

## Alternative: Pause OneDrive

If VS Code doesn't work:

1. Right-click OneDrive icon in system tray
2. Settings → Account → Pause syncing (2 hours)
3. Wait 15 seconds
4. Use command line:
   ```powershell
   cd "C:\Users\User\OneDrive\Desktop\UX-Audit\ai-ux-audit-agent-repo"
   git add -A
   git commit -m "feat: Add Next.js 15 compatibility and troubleshooting improvements"
   ```

---

**Note:** The OneDrive lock file prevents automated commits, but VS Code's git UI typically handles this better.
