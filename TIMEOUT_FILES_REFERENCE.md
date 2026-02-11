# Timeout-Related Files Reference

## 📋 Overview
This document lists all files related to timeout configuration and handling in the project.

---

## 🔧 Configuration Files

### 1. `lib/config.ts` ⭐ **MAIN CONFIGURATION**
**Purpose:** Central timeout configuration for all environments
**Key Timeouts:**
- `timeoutPerPage`: 22s (Netlify), 20s (others)
- `aiAnalysisTimeout`: 15s (Netlify), 20s (others)
- `connectionTimeout`: 20s (Netlify Redis), 30s (Vercel), 10s (dev)
- `progressEndpointTimeout`: 15s (Netlify), 20s (Vercel), 10s (dev)

**Location:** `lib/config.ts`

---

### 2. `netlify.toml` ⭐ **NETLIFY FUNCTION TIMEOUTS**
**Purpose:** Netlify serverless function timeout configuration
**Key Settings:**
- All API routes: 26s timeout (Netlify Pro limit)
- Routes configured:
  - `/api/audit/batch/route.ts`: 26s
  - `/api/audit/site/route.ts`: 26s
  - `/api/audit/route.ts`: 26s
  - `/api/audit/progress/[jobId]/route.ts`: 26s
  - `/api/audit/retry/route.ts`: 26s

**Location:** `netlify.toml` (lines 28-43)

---

## 💻 Implementation Files

### 3. `lib/auditHelper.ts` ⭐ **PAGE AUDIT TIMEOUTS**
**Purpose:** Handles timeouts for individual page audits
**Key Timeouts:**
- Browser launch: 30s
- Page load: 12s (Netlify), 12s (others)
- DOM content: 10s (Netlify), 10s (others)
- Data extraction: 10s (Netlify), 15s (others)
- Screenshot: 5s
- AI analysis: Uses `CONFIG.batch.aiAnalysisTimeout` (15s Netlify, 20s others)

**Timeout Count:** 49 occurrences
**Location:** `lib/auditHelper.ts`

---

### 4. `lib/batchProcessor.ts` ⭐ **BATCH PROCESSING TIMEOUTS**
**Purpose:** Handles timeouts for batch page processing
**Key Timeouts:**
- `timeoutPerPage`: Uses `CONFIG.batch.timeoutPerPage` (22s Netlify, 20s others)
- Page audit retry timeout: `timeoutPerPage + 5000` (buffer)
- Individual page timeout: `config.timeoutPerPage`

**Timeout Count:** 55 occurrences
**Location:** `lib/batchProcessor.ts`

---

### 5. `app/api/audit/batch/route.ts`
**Purpose:** Batch API route timeout handling
**Key Features:**
- Uses `CONFIG.batch.timeoutPerPage` for page processing
- Monitors function duration vs Netlify 26s limit
- Warns if function takes >24s

**Location:** `app/api/audit/batch/route.ts`

---

### 6. `app/api/audit/retry/route.ts`
**Purpose:** Retry API timeout optimization
**Key Features:**
- Fire-and-forget batch trigger (doesn't wait)
- Parallel batch updates to reduce execution time
- Returns immediately to avoid timeout

**Location:** `app/api/audit/retry/route.ts`

---

### 7. `app/api/audit/site/route.ts`
**Purpose:** Full-site audit initialization
**Key Features:**
- Discovery timeout: 45s
- Uses batch API for processing (inherits batch timeouts)

**Location:** `app/api/audit/site/route.ts`

---

### 8. `lib/progressTracker.ts`
**Purpose:** Progress tracking with Redis/Neon timeouts
**Key Timeouts:**
- Redis connection: Uses `CONFIG.redis.connectionTimeout`
- Progress expiration: 30 minutes (1800s)
- Page result expiration: 1 hour (3600s)

**Location:** `lib/progressTracker.ts`

---

## 📚 Documentation Files

### 9. `NETLIFY_TIMEOUT_OPTIMIZATION.md`
**Purpose:** Documents timeout optimization for Netlify
**Contents:**
- Problem description
- Solutions implemented
- Time breakdown
- Testing recommendations

**Location:** `NETLIFY_TIMEOUT_OPTIMIZATION.md`

---

### 10. `NETLIFY_TIMEOUT_TRADE_OFF.md`
**Purpose:** Explains timeout trade-offs and balanced approach
**Contents:**
- Before/after comparison
- Why 22s instead of 18s
- Monitoring recommendations
- Conclusion

**Location:** `NETLIFY_TIMEOUT_TRADE_OFF.md`

---

### 11. `NETLIFY_26S_OPTIMIZATION.md`
**Purpose:** Documents Netlify 26s limit optimization
**Location:** `NETLIFY_26S_OPTIMIZATION.md`

---

## 🔍 Quick Reference

### Current Timeout Values (Netlify)

| Component | Timeout | File |
|-----------|---------|------|
| **Function Limit** | 26s | `netlify.toml` |
| **Page Processing** | 22s | `lib/config.ts` |
| **AI Analysis** | 15s | `lib/config.ts` |
| **Page Load** | 12s | `lib/auditHelper.ts` |
| **Data Extraction** | 10s | `lib/auditHelper.ts` |
| **Redis Connection** | 20s | `lib/config.ts` |
| **Progress Endpoint** | 15s | `lib/config.ts` |

### Current Timeout Values (Vercel/Other)

| Component | Timeout | File |
|-----------|---------|------|
| **Page Processing** | 20s | `lib/config.ts` |
| **AI Analysis** | 20s | `lib/config.ts` |
| **Page Load** | 12s | `lib/auditHelper.ts` |
| **Data Extraction** | 15s | `lib/auditHelper.ts` |
| **Redis Connection** | 30s | `lib/config.ts` |
| **Progress Endpoint** | 20s | `lib/config.ts` |

---

## 🎯 Key Files to Modify

If you need to adjust timeouts, modify these files in order:

1. **`lib/config.ts`** - Main configuration (affects all components)
2. **`netlify.toml`** - Netlify function limits (if deploying to Netlify)
3. **`lib/auditHelper.ts`** - Page-level timeouts (if needed)
4. **`lib/batchProcessor.ts`** - Batch processing timeouts (if needed)

---

## 📝 Notes

- **Netlify Free Tier**: 10s max timeout (insufficient for audits)
- **Netlify Pro**: 26s max timeout (required for audits)
- **Vercel**: 60s max timeout (Pro plan)
- All timeouts are environment-aware (automatically adjust based on platform)

---

**Last Updated:** February 11, 2026
