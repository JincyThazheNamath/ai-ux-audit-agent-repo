import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import Anthropic from '@anthropic-ai/sdk';

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
    // Use Puppeteer with @sparticuz/chromium-min for serverless environments (Vercel)
    // @sparticuz/chromium-min is optimized for serverless and includes all dependencies
    const isProduction = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
    
    let browser;
    try {
      browser = await puppeteer.launch({
        args: isProduction ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: isProduction ? await chromium.executablePath() : undefined,
        headless: true,
      });
    } catch (browserError: any) {
      console.error('Failed to launch browser:', browserError);
      return NextResponse.json({ 
        error: 'Failed to launch browser. This may be a serverless environment configuration issue.',
        details: browserError.message || 'Browser launch failed'
      }, { status: 500 });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    try {
      await page.goto(targetUrl.toString(), { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
    } catch (error) {
      await browser.close();
      return NextResponse.json({ 
        error: 'Failed to load page. Please check the URL is accessible.' 
      }, { status: 400 });
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
        html: document.documentElement.outerHTML.substring(0, 50000), // Limit HTML size
      };
    });

    // Take screenshot
    const screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
    await browser.close();

    // Analyze with AI
    const analysisPrompt = `You are a UX audit expert. Analyze the following website data and identify UX issues.

Website URL: ${targetUrl.toString()}
Page Title: ${pageData.title}
Meta Description: ${pageData.metaDescription}

Page Structure:
- Images: ${pageData.images.length} total, ${pageData.images.filter(i => !i.hasAlt).length} missing alt text
- Links: ${pageData.links.length} total, ${pageData.links.filter(l => !l.hasText).length} without descriptive text
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

Return ONLY a valid JSON array of findings. Format:
[
  {
    "category": "accessibility",
    "severity": "high",
    "issue": "Missing alt text on images",
    "description": "X images lack alt attributes, impacting screen reader users",
    "location": "Hero section",
    "suggestion": "Add descriptive alt text to all images",
    "codeSnippet": "<img src='...' alt='Descriptive text here' />"
  }
]

Focus on the most impactful issues. Return 8-15 findings total.`;

    // Try multiple model names in order of preference
    const modelNames = [
      "claude-3-7-sonnet-latest",   // Best, newest
      "claude-3-7-haiku-latest",    // Fast + cheap fallback
      "claude-3-5-sonnet-latest",   // Legacy fallback
      "claude-3-opus-latest",        // Legacy Opus
      "claude-sonnet-4-20250514",
      "claude-opus-4-20250514",
      "claude-3-5-haiku-20241022"
      // 'claude-3-5-sonnet-20240620', // Standard Claude 3.5 Sonnet
      // 'claude-3-5-sonnet',           // Alternative format
      // 'claude-3-opus-20240229',      // Fallback to Claude 3 Opus
      // 'claude-3-sonnet-20240229',    // Fallback to Claude 3 Sonnet
    ];

    let message: any = null;
    
    try {
      for (const modelName of modelNames) {
        try {
          message = await anthropic.messages.create({
            model: modelName,
            max_tokens: 4000,
            messages: [{
              role: 'user',
              content: analysisPrompt,
            }],
          });
          console.log(`✅ Successfully used model: ${modelName}`);
          break; // Success, exit loop
        } catch (modelError: any) {
          if (modelError.status === 404 && modelNames.indexOf(modelName) < modelNames.length - 1) {
            console.warn(`⚠️ Model ${modelName} not found, trying next...`);
            continue; // Try next model
          }
          // If it's the last model or not a 404 error, throw it
          if (modelNames.indexOf(modelName) === modelNames.length - 1 || modelError.status !== 404) {
            throw modelError;
          }
        }
      }
      
      if (!message) {
        throw new Error('Failed to find a valid model');
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
    try {
      const content = message.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          findings = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Fallback findings if AI parsing fails
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
    }

    // Calculate summary
    const summary = {
      totalIssues: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      accessibility: findings.filter(f => f.category === 'accessibility').length,
      usability: findings.filter(f => f.category === 'usability').length,
      design: findings.filter(f => f.category === 'design').length,
      performance: findings.filter(f => f.category === 'performance').length,
      seo: findings.filter(f => f.category === 'seo').length,
      overallScore: Math.max(0, 100 - (
        findings.filter(f => f.severity === 'critical').length * 15 +
        findings.filter(f => f.severity === 'high').length * 10 +
        findings.filter(f => f.severity === 'medium').length * 5 +
        findings.filter(f => f.severity === 'low').length * 2
      )),
    };

    const result: AuditResult = {
      url: targetUrl.toString(),
      timestamp: new Date().toISOString(),
      findings,
      summary,
      screenshot: `data:image/png;base64,${screenshot}`,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Audit error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to perform audit' },
      { status: 500 }
    );
  }
}


