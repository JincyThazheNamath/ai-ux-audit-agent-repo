# API Setup Checklist - Real Data Integration

## ✅ Current Status

You have:
- ✅ `.env.local` file exists
- ✅ API route configured to use real Anthropic API
- ✅ Frontend updated to call real API endpoint
- ✅ Puppeteer configured for web scraping

## 🔍 Verification Steps

### Step 1: Verify API Key Format
Your `.env.local` should contain:
```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

**Important**: 
- Key should start with `sk-ant-`
- No quotes around the value
- No spaces before/after the `=`
- No trailing commas or semicolons

### Step 2: Restart Development Server
**CRITICAL**: Next.js only loads `.env.local` on server start.

1. Stop the current dev server (Ctrl+C in terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

### Step 3: Test API Key is Loaded
The API route will use `process.env.ANTHROPIC_API_KEY`. If it's empty, you'll get API errors.

### Step 4: Test with a Simple URL
Try auditing a simple, publicly accessible website:
- `example.com` (good for testing)
- `google.com` (fast loading)
- `github.com` (well-structured)

## 🚨 Common Issues & Solutions

### Issue 1: "API Key Not Found" Error
**Solution**: 
- Verify `.env.local` is in `ux-audit-agent/` folder (not parent folder)
- Restart dev server after adding/updating `.env.local`
- Check for typos: `ANTHROPIC_API_KEY` (not `ANTHROPIC_API` or `API_KEY`)

### Issue 2: "Failed to load page" Error
**Possible causes**:
- Website blocks automated access (some sites block Puppeteer)
- Network timeout (try a faster site)
- Invalid URL format

**Solution**: Try a different, simpler website

### Issue 3: "Rate limit exceeded" Error
**Solution**: 
- Check your Anthropic API usage limits
- Wait a few minutes and try again
- Verify your API key has sufficient credits

### Issue 4: Puppeteer Installation Issues
**Solution**:
- Puppeteer should auto-install Chromium on first run
- If issues persist: `npm install puppeteer --force`

## 📊 Expected Behavior

### Successful Real API Call:
1. **Loading time**: 20-60 seconds (depends on website complexity)
2. **Response**: Real findings based on actual website analysis
3. **Screenshot**: Actual website screenshot (not placeholder)
4. **Findings**: 8-15 real issues found by AI analysis

### What You'll See:
- Real website screenshot
- Actual issues found on the website
- AI-generated suggestions based on real page analysis
- Different results for different websites

## 🧪 Testing Checklist

- [ ] `.env.local` exists in `ux-audit-agent/` folder
- [ ] API key is correctly formatted (starts with `sk-ant-`)
- [ ] Dev server restarted after adding API key
- [ ] Tested with `example.com` (should work)
- [ ] Received real findings (not mock data)
- [ ] Screenshot shows actual website (not placeholder SVG)

## 🔧 Next Steps if Still Not Working

1. **Check Server Logs**: Look at terminal output when you click "Audit Website"
   - Should see Puppeteer launching browser
   - Should see API call to Anthropic
   - Any error messages will appear here

2. **Verify API Key Works**: Test API key directly
   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: YOUR_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
   ```

3. **Check Network Tab**: Open browser DevTools → Network tab
   - Look for `/api/audit` request
   - Check response status and error messages

4. **Review API Route Logs**: Check terminal for any errors from the API route

## 💡 Pro Tips

- **Start Simple**: Test with `example.com` first (it's designed to be simple)
- **Check Console**: Browser console and terminal both show errors
- **API Key Format**: Must be exactly `ANTHROPIC_API_KEY=sk-ant-...` (no spaces)
- **Server Restart**: Always restart after changing `.env.local`

## 📞 If Issues Persist

Check:
1. API key validity at https://console.anthropic.com/
2. Account has credits/quota available
3. Network connectivity (can reach Anthropic API)
4. Puppeteer can launch (may need system dependencies)







