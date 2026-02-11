# Netlify Timeout Trade-off Analysis

## The Concern
**Question**: Will reducing timeouts cause MORE pages to fail?

**Answer**: There IS a trade-off, but we've optimized it to minimize failures while respecting Netlify's hard 26s limit.

## The Reality

### Before Optimization
- **timeoutPerPage**: 20s
- **Netlify hard limit**: 26s (function killed automatically)
- **Result**: 
  - Pages taking 18-20s: ✅ Complete successfully
  - Pages taking 20-26s: ❌ Fail (Netlify kills at 26s)
  - Pages taking >26s: ❌ Fail (Netlify kills)

### After Initial Optimization (18s timeout)
- **timeoutPerPage**: 18s  
- **Netlify hard limit**: 26s
- **Result**:
  - Pages taking 18-20s: ❌ **Now fail earlier** (timeout at 18s instead of 20s)
  - Pages taking 20-26s: ❌ Still fail (Netlify kills)
  - **Problem**: Pages that might have completed in 19s now fail at 18s

### After Balanced Optimization (22s timeout) ✅ **CURRENT**
- **timeoutPerPage**: 22s
- **Netlify hard limit**: 26s  
- **Result**:
  - Pages taking 18-22s: ✅ Complete successfully
  - Pages taking 22-26s: ❌ Fail (but would have failed anyway at 26s)
  - **Benefit**: More pages complete while still respecting Netlify's limit

## Why 22s Instead of 18s?

### The Math
```
Netlify Function Timeout: 26s (hard limit, cannot exceed)

With 22s timeoutPerPage:
- Page processing: ~22s max
- Buffer for overhead: ~4s (DB queries, function startup, etc.)
- Total: ~26s ✅ Fits perfectly

With 18s timeoutPerPage:
- Page processing: ~18s max  
- Buffer for overhead: ~8s (excessive buffer)
- Total: ~26s ✅ Fits, but wastes 4s that could complete more pages
```

### The Trade-off

| Timeout | Pages 18-20s | Pages 20-22s | Pages 22-26s | Buffer |
|---------|--------------|--------------|--------------|--------|
| **20s** | ✅ Complete | ❌ Fail (Netlify kills) | ❌ Fail | 6s |
| **18s** | ❌ **Fail early** | ❌ Fail | ❌ Fail | 8s (wasted) |
| **22s** ✅ | ✅ Complete | ✅ **Complete** | ❌ Fail (would fail anyway) | 4s |

## Current Configuration (Balanced)

**File: `lib/config.ts`**
```typescript
timeoutPerPage: 22000, // 22s for Netlify (balanced)
aiAnalysisTimeout: 15000, // 15s (fits in 22s)
```

**Time Breakdown:**
- Page load: ~12s max
- Data extraction: ~10s max (during page load)
- Screenshot: ~1-2s
- AI analysis: ~15s max
- DB save: ~1-2s
- **Total: ~22-24s** (fits in 26s with buffer)

## Monitoring & Adjustment

### If Pages Still Fail Too Often

1. **Check Netlify Logs**: Look at actual execution times
   ```bash
   # In Netlify dashboard → Functions → View logs
   # Look for: "Function execution time: X seconds"
   ```

2. **If most pages complete in <20s**: 
   - Current 22s timeout is good ✅
   - No change needed

3. **If many pages take 20-22s**:
   - Consider increasing to 23s (still fits in 26s)
   - Or investigate why pages are slow (target website performance)

4. **If pages consistently take >24s**:
   - Problem is likely slow target websites, not our timeout
   - Consider: Reducing `maxPages`, checking target site performance

### Recommended Monitoring

Add logging to track actual page completion times:
```typescript
const auditDuration = Date.now() - auditStartTime;
console.log(`Page ${url} completed in ${auditDuration}ms`);
```

Then analyze:
- **<18s**: Safe, plenty of buffer
- **18-22s**: Good, using timeout efficiently  
- **22-26s**: At risk, but would fail anyway
- **>26s**: Would fail regardless (Netlify kills)

## Conclusion

**The balanced 22s timeout:**
- ✅ Maximizes successful page completions
- ✅ Respects Netlify's 26s hard limit
- ✅ Provides 4s buffer for overhead
- ✅ Reduces false failures compared to 18s

**Pages that fail at 22s would likely fail at 26s anyway** due to:
- Slow target websites
- Network latency
- AI API delays

The retry mechanism handles these failures gracefully, allowing users to retry slow pages.

---

**Last Updated**: February 11, 2026
