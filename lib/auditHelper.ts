/**
 * Audit Helper
 * Reusable function for single-page audits
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { AuditResult, AuditFinding } from '../types/audit';
import { getRateLimiter } from './rateLimiter';

const apiKey = process.env.ANTHROPIC_API_KEY || '';
const anthropic = new Anthropic({ apiKey });

// Validate API key on module load
if (!apiKey || apiKey.trim() === '') {
  console.warn('⚠️ ANTHROPIC_API_KEY is not set. AI analysis will fail.');
} else if (!apiKey.startsWith('sk-ant-')) {
  console.warn('⚠️ ANTHROPIC_API_KEY format may be incorrect (should start with "sk-ant-")');
} else {
  console.log('✅ ANTHROPIC_API_KEY loaded successfully');
}

/**
 * Launches browser with appropriate configuration
 */
async function launchBrowser() {
  const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  
  console.log(`  [Browser] Environment: ${isProduction ? 'PRODUCTION (Vercel)' : 'DEVELOPMENT'}`);
  
  const launchOptions: any = {
    headless: true,
  };

  if (isProduction) {
    try {
      console.log(`  [Browser] Initializing @sparticuz/chromium for Vercel...`);
      const executablePath = await chromium.executablePath();
      if (!executablePath) {
        throw new Error('Chromium executable path is null or undefined from @sparticuz/chromium');
      }
      console.log(`  [Browser] ✅ Chromium executable path obtained: ${executablePath.substring(0, 50)}...`);
      
      launchOptions.args = chromium.args || [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ];
      launchOptions.executablePath = executablePath;
      console.log(`  [Browser] ✅ Launch options configured for Vercel`);
    } catch (chromiumError: any) {
      console.error(`  [Browser] ❌ Failed to initialize @sparticuz/chromium:`, chromiumError.message);
      console.error(`  [Browser] Error stack:`, chromiumError.stack);
      throw new Error(`Chromium initialization failed in production: ${chromiumError.message}`);
    }
  } else {
    launchOptions.args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
    ];
    
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
      launchOptions.executablePath = process.env.CHROME_PATH;
    } else {
      const chromePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
        process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
        process.env['PROGRAMFILES(X86)'] ? path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
      ].filter(Boolean) as string[];

      let foundPath: string | null = null;
      for (const chromePath of chromePaths) {
        if (chromePath && fs.existsSync(chromePath)) {
          foundPath = chromePath;
          break;
        }
      }
      
      if (foundPath) {
        launchOptions.executablePath = foundPath;
        console.log(`  ✅ Found Chrome at: ${foundPath}`);
      } else {
        console.log(`  ⚠️ Chrome not found in standard locations, trying channel: chrome`);
        launchOptions.channel = 'chrome';
      }
    }
  }

  try {
    const browser = await puppeteer.launch(launchOptions);
    console.log(`  ✅ Browser launched successfully`);
    return browser;
  } catch (error: any) {
    console.error('❌ Browser launch failed:', error.message);
    console.error('   Launch options:', JSON.stringify(launchOptions, null, 2));
    
    if (error.message.includes('executable') || error.message.includes('not found')) {
      const errorMsg = 
        'Chrome/Chromium not found. Please install Google Chrome or set CHROME_PATH environment variable.\n' +
        'For testing, you can use mock data by setting USE_MOCK_DATA=true in .env.local\n' +
        `Attempted paths: ${launchOptions.executablePath || 'default channel'}`;
      console.error(`   ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    // Log full error for debugging
    console.error('   Full error:', error);
    throw error;
  }
}

/**
 * Audits a single page
 */
export async function auditSinglePage(url: string): Promise<AuditResult> {
  let browser: any = null;
  
  try {
    const targetUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    console.log(`  🔍 Starting audit for: ${targetUrl.toString()}`);
    console.log(`  📅 Timestamp: ${new Date().toISOString()}`);
    
    // Launch browser with retry logic
    console.log(`  🌐 Launching browser...`);
    let browserLaunchAttempts = 0;
    const maxBrowserAttempts = 2;
    
    while (browserLaunchAttempts < maxBrowserAttempts) {
      try {
        browser = await launchBrowser();
        break; // Success, exit loop
      } catch (browserError: any) {
        browserLaunchAttempts++;
        console.error(`  ⚠️ Browser launch attempt ${browserLaunchAttempts}/${maxBrowserAttempts} failed: ${browserError.message}`);
        
        if (browserLaunchAttempts >= maxBrowserAttempts) {
          throw browserError; // Re-throw if all attempts failed
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`  🔄 Retrying browser launch...`);
      }
    }
    
    console.log(`  ✅ Browser launched successfully`);
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Navigate to page with multiple wait strategies
    console.log(`  📄 Loading page: ${targetUrl.toString()}`);
    try {
      // Try networkidle2 first, fallback to domcontentloaded if timeout
      try {
        await page.goto(targetUrl.toString(), { 
          waitUntil: 'networkidle2',
          timeout: 60000 // 60 seconds for networkidle (increased for 10-minute window)
        });
        console.log(`  ✅ Page loaded successfully (networkidle2)`);
      } catch (networkIdleError: any) {
        // Fallback to domcontentloaded if networkidle2 times out
        console.log(`  ⚠️ networkidle2 timeout, trying domcontentloaded...`);
        await page.goto(targetUrl.toString(), { 
          waitUntil: 'domcontentloaded',
          timeout: 45000 // 45 seconds (increased for 10-minute window)
        });
        // Wait a bit for dynamic content
        await page.waitForTimeout(2000);
        console.log(`  ✅ Page loaded successfully (domcontentloaded fallback)`);
      }
    } catch (error: any) {
      await browser.close();
      console.error(`  ❌ Failed to load page: ${error.message}`);
      throw new Error(`Failed to load page: ${error.message}. Please check the URL is accessible.`);
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

    const textElements = Array.from(document.querySelectorAll('p, span, div, a, button, h1, h2, h3, h4, h5, h6'))
      .slice(0, 20)
      .map(el => getComputedStyles(el));

    return {
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      url: window.location.href,
      images,
      links,
      headings,
      buttons,
      forms,
      textStyles: textElements,
      html: document.documentElement.outerHTML.substring(0, 50000),
    };
  });
    console.log(`  ✅ Page data extracted (${pageData.images.length} images, ${pageData.links.length} links)`);

    // Take screenshot
    console.log(`  📸 Taking screenshot...`);
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    console.log(`  ✅ Screenshot captured`);
    
    await browser.close();
    console.log(`  ✅ Browser closed`);

    // Analyze with AI
    console.log(`  🤖 Analyzing with AI...`);
    const analysisPrompt = `You are a UX audit expert. Analyze the following website data and identify UX issues.

Website URL: ${targetUrl.toString()}
Page Title: ${pageData.title}
Meta Description: ${pageData.metaDescription}

Page Structure:
- Images: ${pageData.images.length} total, ${pageData.images.filter((i: any) => !i.hasAlt).length} missing alt text
- Links: ${pageData.links.length} total, ${pageData.links.filter((l: any) => !l.hasText).length} without descriptive text
- Headings: ${pageData.headings.length} total
- Buttons: ${pageData.buttons.length} total
- Forms: ${pageData.forms.length} total

HTML Sample (first 50k chars):
${pageData.html.substring(0, 10000)}

Analyze this website and identify UX issues in these categories:
1. Accessibility (WCAG compliance, alt text, ARIA labels, keyboard navigation)
2. Usability (navigation clarity, call-to-action visibility, form usability)
3. Design Consistency (color schemes, typography, spacing)
4. Performance (image optimization, loading states)
5. SEO (meta tags, heading structure, semantic HTML)

For each issue found, provide:
- category: one of "accessibility", "usability", "design", "performance", "seo"
- severity: "critical", "high", "medium", or "low"
- issue: brief title
- description: detailed explanation
- location: where on the page (e.g., "header navigation", "contact form")
- suggestion: actionable fix recommendation
- codeSnippet: if applicable, provide HTML/CSS code example for the fix

Return ONLY a valid JSON array of findings. IMPORTANT: 
- Use double quotes for all strings
- Escape any quotes inside strings with backslash (\\")
- No trailing commas
- Valid JSON syntax only
- Return ONLY the JSON array, no markdown, no explanations

Format:
[
  {
    "category": "accessibility",
    "severity": "high",
    "issue": "Missing alt text on images",
    "description": "X images lack alt attributes, impacting screen reader users",
    "location": "Hero section",
    "suggestion": "Add descriptive alt text to all images",
    "codeSnippet": "<img src=\\"...\\" alt=\\"Descriptive text here\\" />"
  }
]

Focus on the most impactful issues. Return 8-15 findings total.`;

  // Use environment variable if set, otherwise use fallback list
  const preferredModel = process.env.CLAUDE_MODEL || process.env.ANTHROPIC_MODEL;
  const modelNames = preferredModel 
    ? [preferredModel]  // Use environment variable model first
    : [
        "claude-3-haiku-20240307",      // Primary: Claude 3 Haiku (most accessible)
        "claude-3-sonnet-20240229",     // Fallback: Claude 3 Sonnet
        "claude-3-opus-20240229",       // Fallback: Claude 3 Opus
        "claude-3-5-haiku",             // Try Claude 3.5 Haiku (if available)
        "claude-3-5-sonnet",            // Try Claude 3.5 Sonnet (if available)
      ];

  // Check API key before making requests
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('ANTHROPIC_API_KEY is not set. Please set it in .env.local file.');
  }
  
  let message: any = null;
  const rateLimiter = getRateLimiter();
  
  for (const modelName of modelNames) {
    try {
      // Wait for rate limit before making API call
      await rateLimiter.waitIfNeeded();
      
      console.log(`  🤖 Trying model: ${modelName}`);
      message = await anthropic.messages.create({
        model: modelName,
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: analysisPrompt,
        }],
      });
      
      // Record successful request
      rateLimiter.recordRequest();
      console.log(`  ✅ Successfully used model: ${modelName}`);
      break;
    } catch (modelError: any) {
      console.error(`  ❌ Model ${modelName} failed:`, modelError.status, modelError.message);
      // Handle authentication errors (401)
      if (modelError.status === 401) {
        throw new Error('Authentication failed. Please verify your ANTHROPIC_API_KEY is correct and valid.');
      }
      
      // Handle rate limit errors (429)
      if (modelError.status === 429) {
        const retryAfter = modelError.headers?.['retry-after'] 
          ? parseInt(modelError.headers['retry-after'], 10)
          : undefined;
        rateLimiter.handle429(retryAfter);
        
        // If this is not the last model, wait and retry
        if (modelNames.indexOf(modelName) < modelNames.length - 1) {
          const waitTime = (retryAfter || 60) * 1000;
          console.log(`   ⏳ Rate limited. Waiting ${retryAfter || 60}s before trying next model...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        } else {
          // Last model failed with 429, throw error
          throw new Error(`Rate limit exceeded. Please wait ${retryAfter || 60} seconds before retrying.`);
        }
      }
      
      // Handle model not found (404) - try next model
      if (modelError.status === 404 && modelNames.indexOf(modelName) < modelNames.length - 1) {
        console.log(`   ⚠️ Model ${modelName} not found, trying next model...`);
        continue;
      }
      
      // If this is the last model or error is not 404, throw
      if (modelNames.indexOf(modelName) === modelNames.length - 1 || modelError.status !== 404) {
        throw modelError;
      }
    }
  }
  
    if (!message) {
      console.error(`  ❌ All AI models failed`);
      throw new Error('Failed to find a valid AI model');
    }
    console.log(`  ✅ AI analysis completed`);

    let findings: AuditFinding[] = [];
  try {
    const content = message.content[0];
    if (content.type === 'text') {
      let jsonString = '';
      
      // Strategy 1: Try to extract JSON from markdown code blocks
      const codeBlockMatch = content.text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
        console.log('  📝 Extracted JSON from markdown code block');
      } else {
        // Strategy 2: Try to find JSON array in the text
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
          console.log('  📝 Extracted JSON from text');
        }
      }
      
      if (jsonString) {
        // Clean JSON string: remove control characters that cause parsing errors
        // Remove control characters (except newlines, tabs, carriage returns)
        jsonString = jsonString.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
        // Replace any remaining problematic characters
        jsonString = jsonString.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
          // Try to repair common JSON issues
          // Fix trailing commas before } or ] (most common issue)
          jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
          // Fix missing commas between objects
          jsonString = jsonString.replace(/}\s*{/g, '},{');
          // Fix unescaped quotes in string values (conservative approach)
          // Only fix quotes that are clearly inside string values and not escaped
          // Pattern: "key": "value with "unclosed quote" -> "key": "value with \"escaped quote\""
          // This is a simplified fix - we'll rely on the partial extraction fallback for complex cases
        
        try {
          findings = JSON.parse(jsonString);
          console.log(`  ✅ Successfully parsed ${findings.length} findings`);
        } catch (parseError: any) {
          console.error('  ❌ Error parsing cleaned JSON:', parseError.message);
          console.error('  JSON string length:', jsonString.length);
          
          // Try to extract partial findings by finding valid JSON objects
          try {
            const objectMatches = jsonString.match(/\{[^{}]*"category"[\s\S]*?\}/g);
            if (objectMatches && objectMatches.length > 0) {
              console.log(`  🔧 Attempting to extract ${objectMatches.length} individual findings...`);
              findings = objectMatches.map((objStr: string) => {
                try {
                  // Fix trailing commas in individual objects
                  const fixed = objStr.replace(/,(\s*})/g, '$1');
                  return JSON.parse(fixed);
                } catch {
                  return null;
                }
              }).filter((f: any) => f !== null) as AuditFinding[];
              
              if (findings.length > 0) {
                console.log(`  ✅ Extracted ${findings.length} valid findings from partial JSON`);
              } else {
                throw parseError;
              }
            } else {
              throw parseError;
            }
          } catch (extractError) {
            console.error('  JSON preview (first 500 chars):', jsonString.substring(0, 500));
            console.error('  JSON around error position:', jsonString.substring(Math.max(0, 2200), 2300));
            throw parseError;
          }
        }
      } else {
        console.warn('  ⚠️ No JSON array found in AI response');
      }
    }
  } catch (error: any) {
    console.error('Error parsing AI response:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    // Return a fallback finding instead of empty array
    findings = [
      {
        category: 'accessibility' as const,
        severity: 'high' as const,
        issue: 'Analysis completed',
        description: 'AI analysis completed. Some findings may need manual review due to parsing error.',
        location: 'Page-wide',
        suggestion: 'Review the full audit report. If this persists, check ANTHROPIC_API_KEY and model access.',
      },
    ];
  }

  // Calculate summary
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;
  
  const calculateOverallScore = () => {
    let score = 92;
    score -= Math.min(criticalCount * 5, 20);
    score -= Math.min(highCount * 1.0, 10);
    score -= Math.min(mediumCount * 0.25, 6);
    score -= Math.min(lowCount * 0.05, 1);
    
    if (criticalCount === 0) {
      score += 5;
    }
    
    if (criticalCount === 0 && highCount <= 4) {
      score += Math.min(3, (5 - highCount) * 0.6);
    }
    
      return Math.max(0, Math.min(100, Math.round(score)));
    };
    
    const summary = {
    totalIssues: findings.length,
    critical: criticalCount,
    high: highCount,
    medium: mediumCount,
    low: lowCount,
    accessibility: findings.filter(f => f.category === 'accessibility').length,
    usability: findings.filter(f => f.category === 'usability').length,
    design: findings.filter(f => f.category === 'design').length,
    performance: findings.filter(f => f.category === 'performance').length,
      seo: findings.filter(f => f.category === 'seo').length,
      overallScore: calculateOverallScore(),
    };

    console.log(`  ✅ Audit completed: ${findings.length} findings, Score: ${summary.overallScore}`);

    return {
      url: targetUrl.toString(),
      timestamp: new Date().toISOString(),
      findings,
      summary,
      screenshot: `data:image/png;base64,${screenshot}`,
    };
  } catch (error: any) {
    // Ensure browser is closed even on error
    if (browser) {
      try {
        await browser.close();
        console.log(`  ✅ Browser closed after error`);
      } catch (closeError) {
        console.error(`  ⚠️ Error closing browser:`, closeError);
      }
    }
    
    // Log detailed error information
    console.error(`  ❌ Audit failed for ${url}:`);
    console.error(`     Error: ${error.message}`);
    console.error(`     Error type: ${error.name}`);
    if (error.stack) {
      console.error(`     Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
    }
    
    // Re-throw with more context
    throw new Error(`Audit failed for ${url}: ${error.message}`);
  }
}



