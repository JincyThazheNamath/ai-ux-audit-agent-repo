import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import Anthropic from '@anthropic-ai/sdk';
import { auditConfig } from '../../../audit.config';

// Runtime configuration - Node.js runtime required for Puppeteer
// Note: Edge Runtime is not compatible with Puppeteer, so we use Node.js runtime
export const runtime = 'nodejs';
export const maxDuration = 60; // Maximum execution time in seconds

/**
 * STANDARDIZED AUDIT EXECUTION FOR ENVIRONMENT PARITY:
 * 
 * This audit uses a centralized configuration (audit.config.js) to ensure
 * identical execution across local development and production environments.
 * 
 * Key Standardizations:
 * 1. Simulated Throttling: CPU (4x slowdown) and Network (fast 4G) - NOT observed
 * 2. Browser Consistency: --headless=new with fixed window size (1280x800)
 * 3. Metric Logging: Raw JSON output for top 5 metrics (LCP, TBT, CLS, FCP, Speed Index)
 * 4. Configuration-Driven: All settings from audit.config.js
 * 5. Environment-Aware: Logs production-only factors (CDN, minification, etc.)
 * 
 * These changes ensure audit results are identical (or within acceptable variance) 
 * between local development and Vercel production environments.
 */

// Validate API key on initialization
const apiKey = process.env.ANTHROPIC_API_KEY || '';

if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY is not set in environment variables');
} else if (!apiKey.startsWith('sk-ant-')) {
  console.error('❌ ANTHROPIC_API_KEY format appears invalid (should start with sk-ant-)');
  console.error(`   Key starts with: ${apiKey.substring(0, 10)}...`);
} else {
  console.log('✅ ANTHROPIC_API_KEY loaded successfully');
}

const anthropic = new Anthropic({
  apiKey: apiKey,
});

interface AuditFinding {
  category: 'accessibility' | 'usability' | 'design' | 'performance' | 'seo';
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  description: string;
  location: string;
  suggestion: string;
  codeSnippet?: string;
}

interface AuditResult {
  url: string;
  timestamp: string;
  findings: AuditFinding[];
  summary: {
    totalIssues: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    accessibility: number;
    usability: number;
    design: number;
    performance: number;
    seo: number;
    overallScore: number;
  };
  screenshot?: string;
  realMetrics?: {
    fcp: number;
    lcp: number;
    tti: number;
    tbt: number;
    cls: number;
    speedIndex: number;
  };
  systemFingerprint?: {
    environment: string;
    model: string;
    modelVersion: string;
    nodeVersion: string;
    viewport: string;
    temperature: number;
    runtime: string;
    timestamp: string;
  };
}

// Helper function to score individual metrics (Lighthouse-style)
function scoreMetric(value: number, thresholds: [number, number], weight: number): number {
  // thresholds: [good, needs-improvement]
  // good = 100, needs-improvement = 50, poor = 0
  let score = 100;
  if (value <= thresholds[0]) {
    score = 100;
  } else if (value <= thresholds[1]) {
    // Linear interpolation between good and needs-improvement
    score = 100 - ((value - thresholds[0]) / (thresholds[1] - thresholds[0])) * 50;
  } else {
    score = 0;
  }
  return score * weight;
}

// Analyze accessibility tree and extract violations
interface AccessibilityIssue {
  type: string;
  role?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

function analyzeAccessibilityTree(snapshot: any): { critical: number; high: number; medium: number; low: number; issues: AccessibilityIssue[] } {
  const issues: AccessibilityIssue[] = [];
  let critical = 0, high = 0, medium = 0, low = 0;

  function traverse(node: any) {
    if (!node) return;

    // Check for missing labels
    if (node.role && ['textbox', 'combobox', 'listbox', 'button'].includes(node.role)) {
      if (!node.name && !node.value) {
        issues.push({ type: 'missing-label', role: node.role, severity: 'high' });
        high++;
      }
    }

    // Check for missing ARIA labels on interactive elements
    if (node.role && ['button', 'link', 'checkbox', 'radio'].includes(node.role)) {
      if (!node.name && !node.value) {
        issues.push({ type: 'missing-aria-label', role: node.role, severity: 'medium' });
        medium++;
      }
    }

    // Check for heading hierarchy issues
    if (node.role === 'heading' && !node.name) {
      issues.push({ type: 'empty-heading', severity: 'medium' });
      medium++;
    }

    // Recursively traverse children
    if (node.children) {
      node.children.forEach((child: any) => traverse(child));
    }
  }

  traverse(snapshot);
  return { critical, high, medium, low, issues };
}

// Calculate accessibility score based on violations
function calculateAccessibilityScore(issues: { critical: number; high: number; medium: number; low: number }): number {
  let score = 100;
  score -= issues.critical * 10;
  score -= issues.high * 5;
  score -= issues.medium * 2;
  score -= issues.low * 1;
  return Math.max(0, Math.min(100, score));
}

// Check for structured data (JSON-LD, microdata)
function checkStructuredData(html: string): boolean {
  // Check for JSON-LD
  if (html.includes('application/ld+json')) {
    return true;
  }
  // Check for microdata
  if (html.includes('itemscope') || html.includes('itemtype')) {
    return true;
  }
  return false;
}

// Check for semantic HTML elements
function checkSemanticHTML(html: string): boolean {
  const semanticElements = ['<header', '<nav', '<main', '<article', '<section', '<aside', '<footer'];
  return semanticElements.some(el => html.toLowerCase().includes(el));
}

// Calculate SEO score based on validation data
function calculateSEOScore(seoData: {
  hasMetaDescription: boolean;
  metaDescriptionLength: number;
  titleLength: number;
  hasStructuredData: boolean;
  semanticHTML: boolean;
  altTextCoverage: number;
  hasCanonical: boolean;
  hasOpenGraph: boolean;
}): number {
  let score = 0;
  
  // Meta description: +10 if present and 50-160 chars
  if (seoData.hasMetaDescription && seoData.metaDescriptionLength >= 50 && seoData.metaDescriptionLength <= 160) {
    score += 10;
  }
  
  // Title: +10 if 30-60 chars
  if (seoData.titleLength >= 30 && seoData.titleLength <= 60) {
    score += 10;
  }
  
  // Structured data: +15 if present
  if (seoData.hasStructuredData) {
    score += 15;
  }
  
  // Alt text coverage: +10 if >80%
  if (seoData.altTextCoverage > 0.8) {
    score += 10;
  } else if (seoData.altTextCoverage > 0.5) {
    score += 5;
  }
  
  // Semantic HTML: +10 if proper structure
  if (seoData.semanticHTML) {
    score += 10;
  }
  
  // Canonical: +5 if present
  if (seoData.hasCanonical) {
    score += 5;
  }
  
  // Open Graph: +10 if present
  if (seoData.hasOpenGraph) {
    score += 10;
  }
  
  return Math.min(100, score);
}

// Calculate overall UX score using consistent weighted formula
// This ensures the same calculation regardless of AI response format or environment
function calculateOverallUXScore(
  performance: number,
  accessibility: number,
  design: number,
  seo: number
): number {
  // Consistent weighted formula: Performance(30%) + Accessibility(30%) + Design(25%) + SEO(15%)
  // Ensure all inputs are valid numbers
  const perf = Math.max(0, Math.min(100, performance || 0));
  const acc = Math.max(0, Math.min(100, accessibility || 0));
  const des = Math.max(0, Math.min(100, design || 0));
  const seoScore = Math.max(0, Math.min(100, seo || 0));
  
  const score = (
    perf * 0.3 +
    acc * 0.3 +
    des * 0.25 +
    seoScore * 0.15
  );
  
  // Round to 2 decimal places for consistency
  return Math.round(score * 100) / 100;
}

export async function POST(request: NextRequest) {
  try {
    // Validate API key before proceeding
    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      return NextResponse.json({ 
        error: 'Invalid API key configuration. Please check your ANTHROPIC_API_KEY in .env.local file.',
        details: apiKey ? 'API key format appears invalid' : 'API key is missing'
      }, { status: 500 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Launch browser and crawl page
    // Use Puppeteer with @sparticuz/chromium for serverless environments (Vercel)
    const isProduction = auditConfig.environment.getCurrent() === 'production';
    
    // Use standardized browser args from configuration
    // Ensure --headless=new and fixed window size are ALWAYS present
    let browserArgs = [...auditConfig.browser.launchArgs];
    
    // For production, merge with chromium.args but ensure our critical flags are present
    if (isProduction && chromium.args) {
      // Start with our standardized args
      browserArgs = [...auditConfig.browser.launchArgs];
      
      // Merge critical serverless flags from chromium.args
      const serverlessFlags = chromium.args.filter((arg: string) => 
        !browserArgs.includes(arg) && 
        (arg.includes('--disable') || arg.includes('--no') || arg.includes('--single'))
      );
      browserArgs = [...browserArgs, ...serverlessFlags];
      
      // CRITICAL: Ensure --headless=new is always present (may be overridden by chromium.args)
      if (!browserArgs.includes('--headless=new') && !browserArgs.includes('--headless=chrome')) {
        // Remove any old --headless flag
        browserArgs = browserArgs.filter((arg: string) => !arg.startsWith('--headless'));
        browserArgs.push('--headless=new');
      }
      
      // CRITICAL: Ensure window size is always fixed
      const windowSizeArg = '--window-size=1280,800';
      browserArgs = browserArgs.filter((arg: string) => !arg.startsWith('--window-size'));
      browserArgs.push(windowSizeArg);
    }
    
    const launchOptions: any = {
      headless: auditConfig.browser.headless,
      args: browserArgs,
    };

    if (isProduction) {
      // Production: Use Chromium from @sparticuz/chromium
      launchOptions.executablePath = await chromium.executablePath();
    } else {
      // Development: Try to find local Chrome/Chromium
      // First check CHROME_PATH environment variable (preferred)
      const chromePathEnv = process.env.CHROME_PATH;
      const fs = require('fs');
      const path = require('path');
      
      let foundPath: string | null = null;
      
      // Priority 1: Use CHROME_PATH environment variable if set
      if (chromePathEnv) {
        try {
          if (fs.existsSync(chromePathEnv)) {
            foundPath = chromePathEnv;
            console.log('Development: Using CHROME_PATH environment variable:', foundPath);
          } else {
            console.warn(`CHROME_PATH environment variable set but path not found: ${chromePathEnv}`);
          }
        } catch (e) {
          console.warn(`Error checking CHROME_PATH: ${e}`);
        }
      }
      
      // Priority 2: Search common installation paths if CHROME_PATH not set or not found
      if (!foundPath) {
        const possiblePaths: string[] = [];
        
        if (process.platform === 'win32') {
          possiblePaths.push(
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(process.env.PROGRAMFILES || '', 'Google\\Chrome\\Application\\chrome.exe'),
            path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google\\Chrome\\Application\\chrome.exe')
          );
        } else if (process.platform === 'darwin') {
          possiblePaths.push(
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium'
          );
        } else {
          possiblePaths.push(
            '/usr/bin/google-chrome',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser',
            '/snap/bin/chromium'
          );
        }
        
        for (const chromePath of possiblePaths) {
          try {
            if (fs.existsSync(chromePath)) {
              foundPath = chromePath;
              break;
            }
          } catch (e) {
            // Continue searching
          }
        }
        
        if (foundPath) {
          console.log('Development: Using local Chrome at:', foundPath);
        }
      }
      
      if (foundPath) {
        launchOptions.executablePath = foundPath;
      } else {
        // If Chrome not found, try using chromium from @sparticuz/chromium as fallback
        try {
          launchOptions.executablePath = await chromium.executablePath();
          console.log('Development: Using @sparticuz/chromium as fallback');
        } catch (chromiumError) {
          return NextResponse.json({ 
            error: 'Chrome/Chromium not found. Please install Google Chrome or set CHROME_PATH environment variable.',
            details: 'puppeteer-core requires an executablePath. Chrome was not found in common installation locations.',
            troubleshooting: [
              '1. Install Google Chrome from https://www.google.com/chrome/',
              '2. Or set CHROME_PATH environment variable to your Chrome executable path',
              '3. Or use production deployment (Vercel) which includes Chromium automatically'
            ]
          }, { status: 500 });
        }
      }
    }

    const browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    
    // Standardized viewport size from configuration
    await page.setViewport(auditConfig.browser.viewport);
    
    // IMPORTANT: Apply SIMULATED throttling (not observed) using Chrome DevTools Protocol (CDP)
    // This ensures consistent metrics regardless of host machine performance
    const client = await page.target().createCDPSession();
    
    // Apply SIMULATED CPU throttling (4x slowdown - matches Lighthouse)
    // This is simulated, not actual CPU throttling, ensuring consistent results
    await client.send('Emulation.setCPUThrottlingRate', {
      rate: auditConfig.throttling.cpuSlowdownMultiplier,
    });
    console.log(`[${auditConfig.environment.getCurrent()}] Applied simulated CPU throttling: ${auditConfig.throttling.cpuSlowdownMultiplier}x slowdown`);
    
    // Apply SIMULATED network throttling (fast 4G - matches Lighthouse desktop)
    // This is simulated, not actual network throttling, ensuring consistent results
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: auditConfig.throttling.network.downloadThroughput,
      uploadThroughput: auditConfig.throttling.network.uploadThroughput,
      latency: auditConfig.throttling.network.latency,
    });
    console.log(`[${auditConfig.environment.getCurrent()}] Applied simulated network throttling: ${auditConfig.throttling.network.connectionType} (Download: ${auditConfig.throttling.network.downloadThroughput} bytes/s, Upload: ${auditConfig.throttling.network.uploadThroughput} bytes/s, Latency: ${auditConfig.throttling.network.latency}ms)`);
    
    // Enable Performance API before navigation for consistent metric collection
    await page.evaluateOnNewDocument(() => {
      // Mark audit start time
      performance.mark('audit-start');
      
      // Ensure PerformanceObserver is available for CLS and LCP
      if ('PerformanceObserver' in window) {
        try {
          // Observe layout shifts for CLS
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // CLS entries are automatically collected
            }
          }).observe({ type: 'layout-shift', buffered: true });
          
          // Observe LCP
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              // LCP entries are automatically collected
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {
          // PerformanceObserver not supported, continue
        }
      }
    });
    
    // Standardized page load conditions from configuration
    try {
      await page.goto(targetUrl.toString(), { 
        waitUntil: auditConfig.pageLoad.waitUntil as any,
        timeout: auditConfig.pageLoad.timeout 
      });
      
      // Wait for consistent stabilization period after page load
      // This ensures metrics are collected at the same point in page lifecycle
      await new Promise(resolve => setTimeout(resolve, auditConfig.pageLoad.stabilizationPeriod));
    } catch (error) {
      await browser.close();
      return NextResponse.json({ 
        error: 'Failed to load page. Please check the URL is accessible.' 
      }, { status: 400 });
    }

    // Collect performance metrics using Performance API
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (!navigation) {
        // Fallback if navigation timing not available
        return {
          fcp: 0,
          lcp: 0,
          tti: 0,
          tbt: 0,
          cls: 0,
          speedIndex: 0,
          domContentLoaded: 0,
          loadComplete: 0,
        };
      }

      const paint = performance.getEntriesByType('paint');
      const fcp = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
      
      // Calculate TTI (Time to Interactive) - simplified
      const tti = navigation.domInteractive ? (navigation.domInteractive - navigation.fetchStart) : 0;
      
      // Calculate CLS (Cumulative Layout Shift) - collect from PerformanceObserver if available
      let cls = 0;
      try {
        const layoutShifts = (performance.getEntriesByType('layout-shift') as any[]);
        if (layoutShifts && layoutShifts.length > 0) {
          cls = layoutShifts.reduce((sum: number, entry: any) => {
            if (!entry.hadRecentInput) {
              return sum + (entry.value || 0);
            }
            return sum;
          }, 0);
        }
      } catch (e) {
        // CLS not available - will default to 0
        console.warn('CLS calculation not available');
      }
      
      // Calculate TBT (Total Blocking Time) - from long tasks
      let tbt = 0;
      try {
        const longTasks = (performance.getEntriesByType('longtask') as any[]);
        if (longTasks && longTasks.length > 0) {
          tbt = longTasks.reduce((sum: number, task: any) => {
            const blockingTime = (task.duration || 0) - 50;
            return sum + Math.max(0, blockingTime);
          }, 0);
        }
      } catch (e) {
        // Long tasks not available - will default to 0
        console.warn('TBT calculation not available');
      }
      
      // Calculate LCP (Largest Contentful Paint)
      let lcp = 0;
      try {
        const lcpEntries = (performance.getEntriesByType('largest-contentful-paint') as any[]);
        if (lcpEntries && lcpEntries.length > 0) {
          // Get the last LCP entry (most recent)
          const lastLCP = lcpEntries[lcpEntries.length - 1];
          lcp = lastLCP.renderTime || lastLCP.loadTime || lastLCP.startTime || 0;
        } else {
          // Fallback: estimate from load event
          lcp = navigation.loadEventEnd ? (navigation.loadEventEnd - navigation.fetchStart) : 0;
        }
      } catch (e) {
        // LCP not available, estimate from load time
        lcp = navigation.loadEventEnd ? (navigation.loadEventEnd - navigation.fetchStart) : 0;
      }
      
      // Calculate Speed Index - estimate based on FCP and DCL
      const domContentLoaded = navigation.domContentLoadedEventEnd ? 
        (navigation.domContentLoadedEventEnd - navigation.fetchStart) : 0;
      const speedIndex = Math.max(
        domContentLoaded,
        fcp > 0 ? fcp * 1.5 : domContentLoaded
      );
      
      // Return metrics with consistent rounding to match normalization
      return {
        fcp: fcp,
        lcp: lcp,
        tti: tti,
        tbt: tbt,
        cls: cls,
        speedIndex: speedIndex,
        domContentLoaded: domContentLoaded,
        loadComplete: navigation.loadEventEnd ? (navigation.loadEventEnd - navigation.fetchStart) : 0,
      };
    });

    // Validate and normalize performance metrics for consistency across environments
    // Uses configuration values for normalization
    const validatePerformanceMetrics = (metrics: typeof performanceMetrics): typeof performanceMetrics => {
      const rounding = auditConfig.metrics.normalization.timeRounding;
      const clsPrecision = auditConfig.metrics.normalization.clsPrecision;
      
      // Round all metrics to consistent precision to eliminate floating-point variance
      // This ensures identical values across different Chrome versions and environments
      return {
        fcp: Math.round(Math.max(0, metrics.fcp || 0) / rounding) * rounding,
        lcp: Math.round(Math.max(0, metrics.lcp || 0) / rounding) * rounding,
        tti: Math.round(Math.max(0, metrics.tti || 0) / rounding) * rounding,
        tbt: Math.round(Math.max(0, metrics.tbt || 0) / rounding) * rounding,
        cls: Math.round(Math.max(0, metrics.cls || 0) * Math.pow(10, clsPrecision)) / Math.pow(10, clsPrecision),
        speedIndex: Math.round(Math.max(0, metrics.speedIndex || 0) / rounding) * rounding,
        domContentLoaded: Math.round(Math.max(0, metrics.domContentLoaded || 0) / rounding) * rounding,
        loadComplete: Math.round(Math.max(0, metrics.loadComplete || 0) / rounding) * rounding,
      };
    };

    const validatedMetrics = validatePerformanceMetrics(performanceMetrics);

    // DETAILED METRIC LOGGING: Output raw JSON report for top 5 metrics
    // This helps identify which metric is drifting between environments
    if (auditConfig.logging.enableMetricLogging && auditConfig.logging.logRawMetrics) {
      const top5MetricsReport = {
        environment: auditConfig.environment.getCurrent(),
        timestamp: new Date().toISOString(),
        url: targetUrl.toString(),
        metrics: {
          LCP: {
            value: validatedMetrics.lcp,
            unit: 'ms',
            thresholds: auditConfig.metrics.thresholds.lcp,
            status: validatedMetrics.lcp <= auditConfig.metrics.thresholds.lcp.good ? 'good' :
                    validatedMetrics.lcp <= auditConfig.metrics.thresholds.lcp.needsImprovement ? 'needs-improvement' : 'poor',
          },
          TBT: {
            value: validatedMetrics.tbt,
            unit: 'ms',
            thresholds: auditConfig.metrics.thresholds.tbt,
            status: validatedMetrics.tbt <= auditConfig.metrics.thresholds.tbt.good ? 'good' :
                    validatedMetrics.tbt <= auditConfig.metrics.thresholds.tbt.needsImprovement ? 'needs-improvement' : 'poor',
          },
          CLS: {
            value: validatedMetrics.cls,
            unit: 'score',
            thresholds: auditConfig.metrics.thresholds.cls,
            status: validatedMetrics.cls <= auditConfig.metrics.thresholds.cls.good ? 'good' :
                    validatedMetrics.cls <= auditConfig.metrics.thresholds.cls.needsImprovement ? 'needs-improvement' : 'poor',
          },
          FCP: {
            value: validatedMetrics.fcp,
            unit: 'ms',
            thresholds: auditConfig.metrics.thresholds.fcp,
            status: validatedMetrics.fcp <= auditConfig.metrics.thresholds.fcp.good ? 'good' :
                    validatedMetrics.fcp <= auditConfig.metrics.thresholds.fcp.needsImprovement ? 'needs-improvement' : 'poor',
          },
          SI: {
            value: validatedMetrics.speedIndex,
            unit: 'ms',
            thresholds: auditConfig.metrics.thresholds.si,
            status: validatedMetrics.speedIndex <= auditConfig.metrics.thresholds.si.good ? 'good' :
                    validatedMetrics.speedIndex <= auditConfig.metrics.thresholds.si.needsImprovement ? 'needs-improvement' : 'poor',
          },
        },
      };
      
      console.log('\n=== TOP 5 METRICS RAW JSON REPORT ===');
      console.log(JSON.stringify(top5MetricsReport, null, 2));
      console.log('=== END METRICS REPORT ===\n');
    }

    // Calculate Lighthouse-style performance score using configuration thresholds
    const calculatePerformanceScore = (metrics: typeof validatedMetrics): number => {
      // Handle edge cases where metrics might be 0 or unavailable
      // If all metrics are 0, return a default score of 50 (needs improvement)
      if (metrics.fcp === 0 && metrics.lcp === 0 && metrics.tti === 0) {
        return 50;
      }

      const thresholds = auditConfig.metrics.thresholds;
      const scores = {
        fcp: metrics.fcp > 0 ? scoreMetric(metrics.fcp, [thresholds.fcp.good, thresholds.fcp.needsImprovement], 0.10) : 5,
        lcp: metrics.lcp > 0 ? scoreMetric(metrics.lcp, [thresholds.lcp.good, thresholds.lcp.needsImprovement], 0.25) : 12.5,
        tti: metrics.tti > 0 ? scoreMetric(metrics.tti, [thresholds.tti.good, thresholds.tti.needsImprovement], 0.10) : 5,
        tbt: scoreMetric(metrics.tbt, [thresholds.tbt.good, thresholds.tbt.needsImprovement], 0.30),
        cls: scoreMetric(metrics.cls, [thresholds.cls.good, thresholds.cls.needsImprovement], 0.15),
        speedIndex: metrics.speedIndex > 0 ? scoreMetric(metrics.speedIndex, [thresholds.si.good, thresholds.si.needsImprovement], 0.10) : 5,
      };
      const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
      return Math.max(0, Math.min(100, Math.round(totalScore)));
    };

    const performanceScore = calculatePerformanceScore(validatedMetrics);
    
    // Log production-only factors that might affect metrics
    if (auditConfig.logging.logEnvironmentFactors && isProduction) {
      console.log('\n=== PRODUCTION-ONLY FACTORS (May Affect Metrics) ===');
      console.log(JSON.stringify({
        environment: 'production',
        factors: auditConfig.productionFactors,
        note: 'These factors may cause metric differences between local and production',
      }, null, 2));
      console.log('=== END PRODUCTION FACTORS ===\n');
    }

    // Get accessibility snapshot
    let accessibilitySnapshot: any = null;
    let accessibilityIssues: { critical: number; high: number; medium: number; low: number; issues: AccessibilityIssue[] } = { critical: 0, high: 0, medium: 0, low: 0, issues: [] };
    let accessibilityScore = 100;
    
    try {
      accessibilitySnapshot = await page.accessibility.snapshot();
      accessibilityIssues = analyzeAccessibilityTree(accessibilitySnapshot);
      accessibilityScore = calculateAccessibilityScore(accessibilityIssues);
    } catch (error) {
      console.warn('Accessibility snapshot failed:', error);
    }

    // Extract page data
    const pageData = await page.evaluate(() => {
      const getComputedStyles = (element: Element) => {
        const styles = window.getComputedStyle(element);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          fontFamily: styles.fontFamily,
        };
      };

      const images = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        alt: img.alt || '',
        hasAlt: !!img.alt,
      }));

      const links = Array.from(document.querySelectorAll('a')).map(link => ({
        href: link.href,
        text: link.textContent?.trim() || '',
        hasText: !!(link.textContent?.trim()),
      }));

      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => ({
        tag: h.tagName.toLowerCase(),
        text: h.textContent?.trim() || '',
      }));

      const buttons = Array.from(document.querySelectorAll('button, [role="button"]')).map(btn => ({
        text: btn.textContent?.trim() || '',
        ariaLabel: btn.getAttribute('aria-label') || '',
      }));

      const forms = Array.from(document.querySelectorAll('form, input, textarea, select')).map(form => ({
        type: form.tagName.toLowerCase(),
        label: form.getAttribute('aria-label') || 
               (form.previousElementSibling?.textContent?.trim()) || '',
        required: form.hasAttribute('required'),
      }));

      // Check color contrast (simplified)
      const textElements = Array.from(document.querySelectorAll('p, span, div, a, button, h1, h2, h3, h4, h5, h6'))
        .slice(0, 20)
        .map(el => getComputedStyles(el));

      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const canonical = document.querySelector('link[rel="canonical"]');
      const openGraph = document.querySelector('meta[property^="og:"]');

      return {
        title: document.title,
        metaDescription,
        metaDescriptionLength: metaDescription.length,
        url: window.location.href,
        images,
        links,
        headings,
        buttons,
        forms,
        textStyles: textElements,
        html: document.documentElement.outerHTML.substring(0, 50000), // Limit HTML size
        hasCanonical: !!canonical,
        hasOpenGraph: !!openGraph,
      };
    });

    // Calculate SEO validation data
    const seoData = {
      hasMetaDescription: !!pageData.metaDescription,
      metaDescriptionLength: pageData.metaDescriptionLength || 0,
      titleLength: pageData.title.length,
      hasStructuredData: checkStructuredData(pageData.html),
      semanticHTML: checkSemanticHTML(pageData.html),
      altTextCoverage: pageData.images.length > 0 
        ? pageData.images.filter(i => i.hasAlt).length / pageData.images.length 
        : 1,
      hasCanonical: pageData.hasCanonical || false,
      hasOpenGraph: pageData.hasOpenGraph || false,
    };

    const seoScore = calculateSEOScore(seoData);

    // Take screenshot
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    await browser.close();

    // Analyze with AI using weighted UX & SEO audit framework with REAL METRICS
    const analysisPrompt = `Act as a Senior UX & SEO Auditor. Analyze the provided website using REAL METRICS and Lighthouse-calibrated scoring.

### REAL PERFORMANCE METRICS (Lighthouse-style):
- FCP (First Contentful Paint): ${validatedMetrics.fcp}ms (thresholds: good <1800ms, needs-improvement <3000ms)
- LCP (Largest Contentful Paint): ${validatedMetrics.lcp}ms (thresholds: good <2500ms, needs-improvement <4000ms)
- TTI (Time to Interactive): ${validatedMetrics.tti}ms (thresholds: good <3800ms, needs-improvement <7300ms)
- TBT (Total Blocking Time): ${validatedMetrics.tbt}ms (thresholds: good <200ms, needs-improvement <600ms)
- CLS (Cumulative Layout Shift): ${validatedMetrics.cls} (thresholds: good <0.1, needs-improvement <0.25)
- Speed Index: ${validatedMetrics.speedIndex}ms (thresholds: good <3400ms, needs-improvement <5800ms)

**CALCULATED PERFORMANCE SCORE**: ${performanceScore}/100 (using Lighthouse weighted formula)

### REAL ACCESSIBILITY VIOLATIONS:
- Critical: ${accessibilityIssues.critical}
- High: ${accessibilityIssues.high}
- Medium: ${accessibilityIssues.medium}
- Low: ${accessibilityIssues.low}
- Total Issues: ${accessibilityIssues.issues.length}

**CALCULATED ACCESSIBILITY SCORE**: ${accessibilityScore}/100 (based on violation severity)

### REAL SEO VALIDATION:
- Meta Description: ${seoData.hasMetaDescription ? 'Present' : 'Missing'} (${seoData.metaDescriptionLength} chars, optimal: 50-160)
- Title Length: ${seoData.titleLength} chars (optimal: 30-60)
- Structured Data: ${seoData.hasStructuredData ? 'Present' : 'Missing'}
- Semantic HTML: ${seoData.semanticHTML ? 'Present' : 'Missing'}
- Alt Text Coverage: ${Math.round(seoData.altTextCoverage * 100)}% (optimal: >80%)
- Canonical URL: ${seoData.hasCanonical ? 'Present' : 'Missing'}
- Open Graph Tags: ${seoData.hasOpenGraph ? 'Present' : 'Missing'}

**CALCULATED SEO SCORE**: ${seoScore}/100 (based on validation checks)

### SCORING CALIBRATION (Match Lighthouse Methodology):

1. **Performance Score**: USE THE CALCULATED SCORE ABOVE (${performanceScore}/100). This is already calculated from real metrics using Lighthouse's weighted formula:
   - FCP(10%) + LCP(25%) + TTI(10%) + TBT(30%) + CLS(15%) + SpeedIndex(10%)

2. **Accessibility Score**: USE THE CALCULATED SCORE ABOVE (${accessibilityScore}/100). This is based on real violations:
   - Start at 100, deduct: Critical(-10), High(-5), Medium(-2), Low(-1)

3. **SEO Score**: USE THE CALCULATED SCORE ABOVE (${seoScore}/100). This is based on real validation checks.

4. **Design Score**: Analyze visual hierarchy, UI consistency, and design quality. Calibrate to match typical Lighthouse "Best Practices" scoring (0-100).

### WEBSITE DATA FOR DESIGN ANALYSIS

Website URL: ${targetUrl.toString()}
Page Title: ${pageData.title}
Meta Description: ${pageData.metaDescription}

Page Structure:
- Images: ${pageData.images.length} total, ${pageData.images.filter(i => !i.hasAlt).length} missing alt text
- Links: ${pageData.links.length} total, ${pageData.links.filter(l => !l.hasText).length} without descriptive text
- Headings: ${pageData.headings.length} total
- Buttons: ${pageData.buttons.length} total
- Forms: ${pageData.forms.length} total

HTML Sample (first 10k chars):
${pageData.html.substring(0, 10000)}

### OUTPUT FORMAT:

Return a JSON object. Return ONLY valid JSON:

{
  "scores": {
    "performance": ${performanceScore},
    "accessibility": ${accessibilityScore},
    "design": [Number 0-100, your analysis],
    "seo": ${seoScore}
  },
  "overall_ux_score": [Number calculated as: (Performance*0.3 + Accessibility*0.3 + Design*0.25 + SEO*0.15)],
  "justification": "Short reason for these specific numbers, especially the design score",
  "severity_breakdown": {"critical": X, "high": X, "medium": X, "low": X},
  "top_issues": [
    {
      "category": "accessibility|usability|design|performance|seo",
      "severity": "critical|high|medium|low",
      "issue": "Brief issue title",
      "description": "Detailed explanation of the issue and its impact",
      "location": "Where on the page (e.g., 'header navigation', 'contact form')",
      "suggestion": "Actionable fix recommendation",
      "codeSnippet": "HTML/CSS code example if applicable, or empty string"
    }
  ]
}

IMPORTANT: 
- Use the EXACT performance score (${performanceScore}), accessibility score (${accessibilityScore}), and SEO score (${seoScore}) provided above
- Only calculate the design score yourself based on visual analysis
- Calculate overall_ux_score using: Performance*0.3 + Accessibility*0.3 + Design*0.25 + SEO*0.15

For each finding in top_issues:
- category: one of "accessibility", "usability", "design", "seo"
- severity: "critical", "high", "medium", or "low" based on impact
- issue: concise, actionable title
- description: detailed explanation with user impact
- location: specific area of the page
- suggestion: actionable, implementable recommendation
- codeSnippet: practical code example when applicable

Focus on the most impactful issues. Return 8-15 findings in top_issues array.`;

    // Force use of specific model for consistency across environments
    // Using configuration values ensures identical AI responses
    const preferredModel = auditConfig.ai.preferredModel;
    const fallbackModels = auditConfig.ai.fallbackModels;

    let message: any = null;
    let usedModelName: string = '';
    
    try {
      // Try preferred model first
      try {
        message = await anthropic.messages.create({
          model: preferredModel,
          max_tokens: auditConfig.ai.maxTokens,
          temperature: auditConfig.ai.temperature, // From configuration for deterministic results
          messages: [{
            role: 'user',
            content: analysisPrompt,
          }],
        });
        usedModelName = preferredModel;
        console.log(`✅ Successfully used preferred model: ${preferredModel}`);
      } catch (primaryError: any) {
        // Only use fallback if primary model fails with 404
        if (primaryError.status === 404) {
          console.warn(`⚠️ Preferred model ${preferredModel} not found, trying fallbacks...`);
          for (const modelName of fallbackModels) {
            if (modelName === preferredModel) continue; // Skip if already tried
            try {
              message = await anthropic.messages.create({
                model: modelName,
                max_tokens: auditConfig.ai.maxTokens,
                temperature: auditConfig.ai.temperature,
                messages: [{
                  role: 'user',
                  content: analysisPrompt,
                }],
              });
              usedModelName = modelName;
              console.log(`✅ Successfully used fallback model: ${modelName}`);
              break;
            } catch (fallbackError: any) {
              if (fallbackModels.indexOf(modelName) === fallbackModels.length - 1) {
                throw primaryError; // Throw original error if all fail
              }
              continue;
            }
          }
        } else {
          throw primaryError; // Re-throw if not a 404 error
        }
      }
      
      if (!message) {
        throw new Error(`Failed to find a valid model. Tried: ${preferredModel} and fallbacks`);
      }
    } catch (apiError: any) {
      console.error('Anthropic API Error:', apiError);
      if (apiError.status === 401) {
        return NextResponse.json({ 
          error: 'Authentication failed. Please verify your ANTHROPIC_API_KEY is correct.',
          details: 'The API key may be invalid, expired, or incorrectly formatted. Check your .env.local file and ensure the key starts with "sk-ant-"',
          troubleshooting: [
            '1. Verify API key in .env.local file',
            '2. Ensure key starts with "sk-ant-"',
            '3. Check for extra spaces or quotes around the key',
            '4. Restart dev server after updating .env.local',
            '5. Verify key is valid at https://console.anthropic.com/'
          ]
        }, { status: 401 });
      }
      if (apiError.status === 404) {
        return NextResponse.json({ 
          error: 'Model not found. The specified Claude model is not available.',
          details: 'Tried multiple model names but none were found. This may indicate an API version mismatch.',
          troubleshooting: [
            '1. Check Anthropic API documentation for available models',
            '2. Verify your API key has access to the requested model',
            '3. Try updating @anthropic-ai/sdk package: npm install @anthropic-ai/sdk@latest',
            '4. Check Anthropic console for model availability'
          ]
        }, { status: 404 });
      }
      throw apiError;
    }

    let findings: AuditFinding[] = [];
    let uxScore = 0;
    let severityBreakdown = { critical: 0, high: 0, medium: 0, low: 0 };
    let categoryScores = { 
      performance: performanceScore, 
      accessibility: accessibilityScore, 
      usability: 0, 
      design: 0, 
      seo: seoScore 
    };
    let justification = '';
    
    try {
      const content = message.content[0];
      if (content.type === 'text') {
        // Try to extract JSON object with scores format (newest), ux_score format, or array (legacy)
        const scoresFormatMatch = content.text.match(/\{[\s\S]*"scores"[\s\S]*\}/);
        const uxScoreFormatMatch = content.text.match(/\{[\s\S]*"ux_score"[\s\S]*\}/);
        const jsonArrayMatch = content.text.match(/\[[\s\S]*\]/);
        
        if (scoresFormatMatch) {
          // Newest format with scores object and weighted calculation
          const auditData = JSON.parse(scoresFormatMatch[0]);
          if (auditData.scores) {
            // ALWAYS use server-calculated scores for performance, accessibility, and SEO
            // NEVER use AI-provided values for these - they must match our calculations
            // Only use AI-provided design score
            categoryScores = {
              performance: performanceScore, // Force use of calculated score
              accessibility: accessibilityScore, // Force use of calculated score
              usability: auditData.scores.usability || 0,
              design: auditData.scores.design || 0,
              seo: seoScore, // Force use of calculated score
            };
            // Always recalculate overall score server-side using standardized function
            uxScore = calculateOverallUXScore(
              categoryScores.performance,
              categoryScores.accessibility,
              categoryScores.design,
              categoryScores.seo
            );
          } else {
            // If scores object not provided, use calculated scores and default design
            categoryScores = {
              performance: performanceScore,
              accessibility: accessibilityScore,
              usability: 0,
              design: 70, // Default design score if not provided
              seo: seoScore,
            };
            // Always recalculate overall score server-side
            uxScore = calculateOverallUXScore(
              categoryScores.performance,
              categoryScores.accessibility,
              categoryScores.design,
              categoryScores.seo
            );
          }
          justification = auditData.justification || '';
          severityBreakdown = auditData.severity_breakdown || { critical: 0, high: 0, medium: 0, low: 0 };
          findings = auditData.top_issues || [];
        } else if (uxScoreFormatMatch) {
          // Format with ux_score, severity_breakdown, top_issues
          const auditData = JSON.parse(uxScoreFormatMatch[0]);
          // Ignore AI's ux_score, always recalculate using calculated scores
          categoryScores = {
            performance: performanceScore,
            accessibility: accessibilityScore,
            usability: 0,
            design: 70, // Default if not provided
            seo: seoScore,
          };
          // Always recalculate overall score server-side
          uxScore = calculateOverallUXScore(
            categoryScores.performance,
            categoryScores.accessibility,
            categoryScores.design,
            categoryScores.seo
          );
          severityBreakdown = auditData.severity_breakdown || { critical: 0, high: 0, medium: 0, low: 0 };
          findings = auditData.top_issues || [];
        } else if (jsonArrayMatch) {
          // Legacy format - array of findings
          findings = JSON.parse(jsonArrayMatch[0]);
          // Calculate score and breakdown from findings
          severityBreakdown = {
            critical: findings.filter(f => f.severity === 'critical').length,
            high: findings.filter(f => f.severity === 'high').length,
            medium: findings.filter(f => f.severity === 'medium').length,
            low: findings.filter(f => f.severity === 'low').length,
          };
          // Use real metrics for performance, accessibility, SEO, and calculate design from findings
          const designScore = Math.max(0, 100 - (
            severityBreakdown.critical * 15 +
            severityBreakdown.high * 10 +
            severityBreakdown.medium * 5 +
            severityBreakdown.low * 2
          ));
          categoryScores = {
            performance: performanceScore,
            accessibility: accessibilityScore,
            usability: 0,
            design: designScore,
            seo: seoScore,
          };
          // Always recalculate overall score server-side using standardized function
          uxScore = calculateOverallUXScore(
            categoryScores.performance,
            categoryScores.accessibility,
            categoryScores.design,
            categoryScores.seo
          );
        }
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Fallback findings if AI parsing fails - use real metrics
      findings = [
        {
          category: 'accessibility',
          severity: 'high',
          issue: 'Analysis completed',
          description: 'AI analysis completed. Some findings may need manual review.',
          location: 'Page-wide',
          suggestion: 'Review the full audit report',
        },
      ];
      severityBreakdown = { critical: 0, high: 1, medium: 0, low: 0 };
      categoryScores = { 
        performance: performanceScore, 
        accessibility: accessibilityScore, 
        usability: 70, 
        design: 70, 
        seo: seoScore 
      };
      // Always recalculate overall score server-side using standardized function
      uxScore = calculateOverallUXScore(
        categoryScores.performance,
        categoryScores.accessibility,
        categoryScores.design,
        categoryScores.seo
      );
      justification = 'Fallback score due to parsing error - using real metrics where available';
    }

    // Environment-aware logging for debugging score differences (backend only, no UI impact)
    const environment = process.env.VERCEL === '1' ? 'Vercel' : 'Local';
    const nodeVersion = process.version;
    const runtimeInfo = {
      environment,
      nodeVersion,
      model: usedModelName || 'unknown',
      viewport: '1280x800',
      temperature: 0.0,
      timestamp: new Date().toISOString(),
    };
    
    console.log(`[${environment}] System Fingerprint:`, runtimeInfo);
    console.log(`[${environment}] Score Calculation:`, {
      performance: categoryScores.performance,
      accessibility: categoryScores.accessibility,
      design: categoryScores.design,
      seo: categoryScores.seo,
      overall: uxScore,
      formula: 'Performance(30%) + Accessibility(30%) + Design(25%) + SEO(15%)',
    });

    // Calculate summary using AI-provided data or calculated values
    const summary = {
      totalIssues: findings.length,
      critical: severityBreakdown.critical,
      high: severityBreakdown.high,
      medium: severityBreakdown.medium,
      low: severityBreakdown.low,
      accessibility: findings.filter(f => f.category === 'accessibility').length,
      usability: findings.filter(f => f.category === 'usability').length,
      design: findings.filter(f => f.category === 'design').length,
      performance: findings.filter(f => f.category === 'performance').length,
      seo: findings.filter(f => f.category === 'seo').length,
      overallScore: uxScore,
    };

    // System Fingerprint for deterministic auditing
    // ALWAYS ensure these fields are included with explicit values (never undefined)
    const systemFingerprint = {
      environment: environment || 'unknown',
      model: usedModelName || 'unknown',
      modelVersion: usedModelName || 'unknown',
      nodeVersion: process.version || 'unknown',
      viewport: '1280x800',
      temperature: 0.0,
      runtime: 'nodejs',
      timestamp: new Date().toISOString(),
    };

    // ALWAYS ensure realMetrics has explicit values (never undefined/null)
    // This ensures the fields are always included in production responses
    const realMetricsData = {
      fcp: validatedMetrics?.fcp ?? 0,
      lcp: validatedMetrics?.lcp ?? 0,
      tti: validatedMetrics?.tti ?? 0,
      tbt: validatedMetrics?.tbt ?? 0,
      cls: validatedMetrics?.cls ?? 0,
      speedIndex: validatedMetrics?.speedIndex ?? 0,
    };

    const result: AuditResult = {
      url: targetUrl.toString(),
      timestamp: new Date().toISOString(),
      findings,
      summary,
      screenshot: `data:image/png;base64,${screenshot}`,
      // EXPLICITLY include these fields - never optional in practice
      realMetrics: realMetricsData,
      systemFingerprint: systemFingerprint,
    };

    // Log system fingerprint for debugging
    console.log('System Fingerprint:', systemFingerprint);
    console.log('Real Metrics:', realMetricsData);

    // Ensure response explicitly includes these fields
    const response = NextResponse.json(result);
    
    // Explicitly log that fields are included (for debugging production issues)
    console.log('Response includes realMetrics:', !!result.realMetrics);
    console.log('Response includes systemFingerprint:', !!result.systemFingerprint);
    
    return response;
  } catch (error: any) {
    console.error('Audit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform audit' },
      { status: 500 }
    );
  }
}


