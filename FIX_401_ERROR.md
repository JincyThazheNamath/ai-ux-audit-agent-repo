# Fix 401 Authentication Error - "invalid x-api-key"

## 🔴 Error Message
```
401 {"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}
```

## Root Causes & Solutions

### Issue 1: API Key Not Loaded from .env.local ⚠️ MOST COMMON

**Symptoms:**
- Error appears immediately
- Terminal shows "ANTHROPIC_API_KEY is not set"

**Solution:**
1. **Verify file location**: `.env.local` must be in `ux-audit-agent/` folder (not parent folder)
2. **Check file format**:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
   ```
   - NO quotes around the value
   - NO spaces before/after `=`
   - NO trailing commas
3. **Restart dev server** (CRITICAL):
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

### Issue 2: API Key Format Incorrect

**Symptoms:**
- Key doesn't start with `sk-ant-`
- Has extra characters or spaces

**Solution:**
1. **Get fresh API key** from https://console.anthropic.com/
2. **Copy exactly** - don't add quotes or spaces
3. **Format should be**:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. **Verify** using the verification script:
   ```bash
   node verify-api-key.js
   ```

### Issue 3: API Key Has Quotes or Spaces

**Wrong:**
```
ANTHROPIC_API_KEY="sk-ant-api03-xxx"
ANTHROPIC_API_KEY = sk-ant-api03-xxx
ANTHROPIC_API_KEY=sk-ant-api03-xxx,
```

**Correct:**
```
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### Issue 4: API Key Invalid or Expired

**Symptoms:**
- Key format looks correct
- Still getting 401 error

**Solution:**
1. **Verify key is active**:
   - Go to https://console.anthropic.com/
   - Check API keys section
   - Ensure key is not revoked
2. **Check account status**:
   - Verify account has credits/quota
   - Check if account is in good standing
3. **Generate new key** if needed:
   - Create new API key
   - Update `.env.local`
   - Restart server

### Issue 5: Wrong Environment File

**Check:**
- Using `.env.local` (not `.env`)
- File is in correct location: `ux-audit-agent/.env.local`
- Not accidentally using production `.env` file

## 🔧 Step-by-Step Fix

### Step 1: Verify API Key File
```bash
cd ux-audit-agent
cat .env.local
```

Should show:
```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

### Step 2: Run Verification Script
```bash
node verify-api-key.js
```

This will check:
- ✅ Key exists
- ✅ Format is correct
- ✅ No common issues

### Step 3: Check Server Logs
When you start `npm run dev`, you should see:
```
✅ ANTHROPIC_API_KEY loaded successfully
```

If you see:
```
❌ ANTHROPIC_API_KEY is not set
```
Then the key isn't being loaded.

### Step 4: Test API Key Directly
```bash
# Install dotenv-cli if needed
npm install -g dotenv-cli

# Test API key
dotenv -e .env.local -- node -e "console.log(process.env.ANTHROPIC_API_KEY)"
```

Should output your API key (starts with `sk-ant-`).

## 🧪 Quick Diagnostic Test

Run this in your terminal:
```bash
cd ux-audit-agent
node verify-api-key.js
```

**Expected output if correct:**
```
=== API Key Verification ===

✅ API Key found
   Length: 95 characters
   Starts with: sk-ant-

✅ API key format looks correct!
   Make sure to restart your dev server after setting this.
```

**If you see errors**, follow the suggestions provided.

## 📋 Checklist

- [ ] `.env.local` exists in `ux-audit-agent/` folder
- [ ] API key starts with `sk-ant-`
- [ ] No quotes around API key value
- [ ] No spaces around `=` sign
- [ ] Dev server restarted after setting key
- [ ] Terminal shows "✅ ANTHROPIC_API_KEY loaded successfully"
- [ ] API key is valid at https://console.anthropic.com/
- [ ] Account has credits/quota available

## 🚨 Still Not Working?

### Option 1: Hardcode Test (Temporary)
To verify the key itself works, temporarily hardcode it in `route.ts`:
```typescript
const anthropic = new Anthropic({
  apiKey: 'sk-ant-api03-YOUR-ACTUAL-KEY-HERE',
});
```

**⚠️ REMOVE THIS AFTER TESTING** - Never commit hardcoded keys!

### Option 2: Check Next.js Environment Loading
Next.js requires server restart to load `.env.local`. Try:
1. Stop server completely
2. Clear `.next` folder: `rm -rf .next`
3. Restart: `npm run dev`

### Option 3: Verify Key Works with curl
```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'
```

If this works, the key is valid and the issue is with Next.js loading it.

## 💡 Pro Tips

1. **Always restart** after changing `.env.local`
2. **Check terminal** for initialization messages
3. **Use verification script** before debugging further
4. **Never commit** `.env.local` to git (already in .gitignore)
5. **Copy key carefully** - no extra spaces or characters

## 📞 If All Else Fails

1. Generate a **new API key** from Anthropic console
2. Create **fresh `.env.local`** file
3. Add only: `ANTHROPIC_API_KEY=sk-ant-new-key-here`
4. Restart dev server
5. Test immediately

The error message will now be more helpful - it will tell you exactly what's wrong with the API key configuration.







