# 🔐 Netlify Environment Variables Setup

## Required Environment Variables

Set these in **Netlify Dashboard** → **Site settings** → **Environment variables**

### 1. ANTHROPIC_API_KEY (Required)
```
Variable name: ANTHROPIC_API_KEY
Value: sk-ant-xxxxx... (your Claude API key)
Scope: All scopes
```
**Get from:** Your `.env.local` file (already configured)

### 2. Database (Choose ONE)

#### Option A: Redis Labs (Recommended)
```
Variable name: REDIS_URL
Value: redis://default:password@host:port
Scope: All scopes
```

#### Option B: Neon PostgreSQL (If you prefer)
```
Variable name: NETLIFY_DATABASE_URL
Value: postgresql://user:pass@host/dbname
Scope: All scopes
```

**Note:** Your `.env.local` shows `NETLIFY_DATABASE_URL` is configured, so use that if you prefer PostgreSQL.

### 3. NODE_ENV (Required)
```
Variable name: NODE_ENV
Value: production
Scope: All scopes
```

### 4. NETLIFY (Required)
```
Variable name: NETLIFY
Value: true
Scope: All scopes
```

---

## 📋 Quick Setup Steps

1. **Go to Netlify Dashboard**
   - https://app.netlify.com
   - Your site → **Site settings** → **Environment variables**

2. **Add each variable:**
   - Click **"Add a variable"**
   - Enter name and value
   - Select **"All scopes"**
   - Click **"Save"**

3. **Redeploy:**
   - After adding variables, go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Deploy site"**

---

## ✅ Verification

After setting variables and redeploying:

1. Check **Function logs** for errors
2. Test **single-page audit** - should work
3. Test **full-site audit** - should discover pages
4. Check **progress updates** - should work correctly

---

## 🔍 Where to Find Your Values

- **ANTHROPIC_API_KEY:** Check your `.env.local` file
- **NETLIFY_DATABASE_URL:** Check your `.env.local` file (if using Neon)
- **REDIS_URL:** Get from Redis Labs dashboard (if using Redis)

---

## ⚠️ Important Notes

- **Never commit** `.env.local` to Git (it's in `.gitignore`)
- **Always set** environment variables in Netlify Dashboard
- **Redeploy** after adding/updating variables
- **Check logs** if something doesn't work
