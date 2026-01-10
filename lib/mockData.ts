import { AuditFinding, AuditResult } from '../types/audit';

// Move mock data outside component to prevent recreation on every render
export const generateSampleComMockData = (): AuditFinding[] => {
  return [
    {
      category: 'accessibility',
      severity: 'critical',
      issue: 'Missing ARIA labels on interactive elements',
      description: 'Sample.com has 8 interactive buttons and links without proper ARIA labels, making navigation impossible for screen reader users.',
      location: 'Navigation and action buttons',
      suggestion: 'Add aria-label attributes to all interactive elements that lack visible text labels.',
      codeSnippet: '<button aria-label="Close dialog">×</button>',
    },
    {
      category: 'accessibility',
      severity: 'high',
      issue: 'Focus indicators not visible',
      description: 'Keyboard focus indicators are too subtle (1px outline) and fail WCAG 2.1 Level AA contrast requirements.',
      location: 'All focusable elements',
      suggestion: 'Enhance focus indicators with 2px solid outline and ensure 3:1 contrast ratio against background.',
      codeSnippet: '*:focus {\n  outline: 2px solid #14b8a6;\n  outline-offset: 2px;\n}',
    },
    {
      category: 'accessibility',
      severity: 'medium',
      issue: 'Video content lacks captions',
      description: 'Three promotional videos on the homepage have no closed captions, excluding deaf and hard-of-hearing users.',
      location: 'Video section',
      suggestion: 'Add closed captions using <track> elements or provide transcript links for all video content.',
      codeSnippet: '<video>\n  <track kind="captions" src="captions.vtt" srclang="en" />\n</video>',
    },
    {
      category: 'accessibility',
      severity: 'low',
      issue: 'Language attribute missing',
      description: 'HTML lang attribute is not specified, which may cause screen readers to use incorrect pronunciation.',
      location: 'HTML element',
      suggestion: 'Add lang attribute to the <html> tag to specify the primary language.',
      codeSnippet: '<html lang="en">',
    },
    {
      category: 'usability',
      severity: 'critical',
      issue: 'No loading states for async operations',
      description: 'Form submissions and data fetches show no loading indicators, causing users to repeatedly click buttons.',
      location: 'Forms and data tables',
      suggestion: 'Add loading spinners and disable buttons during async operations to provide clear feedback.',
      codeSnippet: '<button disabled={loading}>\n  {loading ? <Spinner /> : "Submit"}\n</button>',
    },
    {
      category: 'usability',
      severity: 'high',
      issue: 'Error messages are not user-friendly',
      description: 'Error messages display technical jargon like "HTTP 500" instead of actionable user guidance.',
      location: 'Error pages and forms',
      suggestion: 'Replace technical errors with clear, actionable messages that guide users on next steps.',
      codeSnippet: '// Instead of: "Error 500"\n// Use: "Something went wrong. Please try again in a moment."',
    },
    {
      category: 'usability',
      severity: 'medium',
      issue: 'No search functionality',
      description: 'Site with 50+ pages lacks a search feature, forcing users to navigate through multiple menus.',
      location: 'Site-wide',
      suggestion: 'Add a prominent search bar in the header with autocomplete and search result highlighting.',
      codeSnippet: '<input type="search" placeholder="Search..." aria-label="Site search" />',
    },
    {
      category: 'usability',
      severity: 'low',
      issue: 'No print stylesheet',
      description: 'Pages print poorly with navigation menus and ads cluttering the printed output.',
      location: 'Print media',
      suggestion: 'Add print-specific CSS to hide navigation and ads, optimize content layout for printing.',
      codeSnippet: '@media print {\n  nav, .ads { display: none; }\n  body { font-size: 12pt; }\n}',
    },
    {
      category: 'design',
      severity: 'critical',
      issue: 'Mobile layout completely broken',
      description: 'Desktop-only layout causes horizontal scrolling on mobile devices, making the site unusable on phones.',
      location: 'Mobile viewport',
      suggestion: 'Implement responsive design with mobile-first approach and test on actual devices.',
      codeSnippet: '@media (max-width: 768px) {\n  .container { width: 100%; padding: 1rem; }\n}',
    },
    {
      category: 'design',
      severity: 'high',
      issue: 'Inconsistent button styles',
      description: 'Five different button styles are used across the site without clear hierarchy or purpose.',
      location: 'Site-wide',
      suggestion: 'Establish a button component system with primary, secondary, and tertiary variants.',
      codeSnippet: '.btn-primary { /* Main actions */ }\n.btn-secondary { /* Secondary actions */ }\n.btn-tertiary { /* Tertiary actions */ }',
    },
    {
      category: 'design',
      severity: 'medium',
      issue: 'Poor visual hierarchy',
      description: 'All text uses similar font sizes and weights, making it difficult to scan and understand content structure.',
      location: 'Content pages',
      suggestion: 'Establish clear typographic hierarchy with distinct heading sizes and weights.',
      codeSnippet: 'h1 { font-size: 2.5rem; font-weight: 700; }\nh2 { font-size: 2rem; font-weight: 600; }',
    },
    {
      category: 'design',
      severity: 'low',
      issue: 'Icon inconsistency',
      description: 'Mix of Font Awesome, Material Icons, and custom SVGs creates visual inconsistency.',
      location: 'Site-wide',
      suggestion: 'Standardize on a single icon library and maintain consistent sizing and styling.',
      codeSnippet: '// Use consistent icon library\nimport { Icon } from "lucide-react";',
    },
    {
      category: 'performance',
      severity: 'critical',
      issue: 'Blocking JavaScript in head',
      description: 'Large JavaScript bundles (500KB+) load synchronously in <head>, blocking page rendering for 3+ seconds.',
      location: 'HTML head',
      suggestion: 'Move scripts to bottom of body or use async/defer attributes to prevent render blocking.',
      codeSnippet: '<script src="app.js" defer></script>',
    },
    {
      category: 'performance',
      severity: 'high',
      issue: 'No CDN for static assets',
      description: 'All images and CSS served from single origin, causing slow load times for international users.',
      location: 'Static assets',
      suggestion: 'Use a CDN to serve static assets from edge locations closer to users.',
      codeSnippet: '// Use CDN URLs\n<img src="https://cdn.sample.com/images/hero.jpg" />',
    },
    {
      category: 'performance',
      severity: 'medium',
      issue: 'Missing browser caching headers',
      description: 'Static assets lack Cache-Control headers, forcing browsers to re-download unchanged files.',
      location: 'Server configuration',
      suggestion: 'Set appropriate cache headers for static assets (1 year) and HTML (no cache).',
      codeSnippet: 'Cache-Control: public, max-age=31536000',
    },
    {
      category: 'performance',
      severity: 'low',
      issue: 'Unused CSS not removed',
      description: 'CSS bundle includes 40KB of unused styles from framework, increasing load time unnecessarily.',
      location: 'CSS bundle',
      suggestion: 'Use PurgeCSS or similar tools to remove unused CSS before production deployment.',
      codeSnippet: '// Use PurgeCSS in build process\npurgecss --content "./src/**/*.html" --css "./src/**/*.css"',
    },
    {
      category: 'seo',
      severity: 'critical',
      issue: 'Duplicate title tags',
      description: 'All 50+ pages use the same title "Sample.com", causing SEO issues and poor search result display.',
      location: 'All pages',
      suggestion: 'Create unique, descriptive title tags for each page (50-60 characters) with relevant keywords.',
      codeSnippet: '<title>Sample.com - Homepage | Your Unique Value Proposition</title>',
    },
    {
      category: 'seo',
      severity: 'high',
      issue: 'No XML sitemap',
      description: 'Search engines cannot efficiently discover and index all pages without a sitemap.xml file.',
      location: 'Site root',
      suggestion: 'Generate and submit XML sitemap to Google Search Console and Bing Webmaster Tools.',
      codeSnippet: '<!-- sitemap.xml -->\n<urlset>\n  <url><loc>https://sample.com/page1</loc></url>\n</urlset>',
    },
    {
      category: 'seo',
      severity: 'medium',
      issue: 'Missing hreflang tags',
      description: 'Multi-language site lacks hreflang tags, potentially causing duplicate content issues.',
      location: 'HTML head',
      suggestion: 'Add hreflang tags to indicate language and regional variants of pages.',
      codeSnippet: '<link rel="alternate" hreflang="en" href="https://sample.com/en/" />\n<link rel="alternate" hreflang="es" href="https://sample.com/es/" />',
    },
    {
      category: 'seo',
      severity: 'low',
      issue: 'Missing robots.txt file',
      description: 'No robots.txt file exists, preventing control over search engine crawling behavior.',
      location: 'Site root',
      suggestion: 'Create robots.txt to guide search engine crawlers and prevent indexing of admin pages.',
      codeSnippet: 'User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: https://sample.com/sitemap.xml',
    },
  ];
};

export const generateDefaultMockData = (): AuditFinding[] => {
  return [
    // ACCESSIBILITY - All Severities
    {
      category: 'accessibility',
      severity: 'critical',
      issue: 'Missing alt text on hero images',
      description: 'The main hero section contains 3 images without alt attributes. Screen reader users cannot understand the visual content, violating WCAG 2.1 Level A requirements.',
      location: 'Hero section',
      suggestion: 'Add descriptive alt text to all images that convey meaning. Decorative images should have empty alt attributes.',
      codeSnippet: '<!-- Before (Missing alt text) -->\n<img src="hero-image.jpg" />\n\n<!-- After (Fixed with descriptive alt text) -->\n<img src="hero-image.jpg" alt="Team members collaborating in modern office space" />',
    },
    {
      category: 'accessibility',
      severity: 'high',
      issue: 'Low color contrast in navigation links',
      description: 'Navigation links use #4A5568 on #1A2332 background, resulting in a contrast ratio of 3.2:1, which fails WCAG AA standards (requires 4.5:1 for normal text).',
      location: 'Header navigation',
      suggestion: 'Increase text color contrast to meet WCAG AA standards. Use a lighter shade like #E2E8F0 or add background hover states.',
      codeSnippet: '.nav-link { color: #E2E8F0; } /* Contrast ratio: 8.5:1 */',
    },
    {
      category: 'accessibility',
      severity: 'medium',
      issue: 'Form inputs missing labels',
      description: 'Contact form has 2 input fields without associated label elements or aria-labels, making them inaccessible to screen readers.',
      location: 'Contact form',
      suggestion: 'Add proper label elements for all form inputs, or use aria-label attributes for icon-only inputs.',
      codeSnippet: '<label for="email">Email Address</label>\n<input type="email" id="email" name="email" required>',
    },
    {
      category: 'accessibility',
      severity: 'low',
      issue: 'Missing skip to main content link',
      description: 'No skip navigation link is provided, forcing keyboard users to tab through repetitive navigation elements on every page load.',
      location: 'Page header',
      suggestion: 'Add a skip link as the first focusable element to allow users to bypass navigation and jump to main content.',
      codeSnippet: '<a href="#main-content" class="skip-link">Skip to main content</a>',
    },
    {
      category: 'accessibility',
      severity: 'high',
      issue: 'Keyboard navigation not fully functional',
      description: 'Dropdown menus and modal dialogs cannot be fully navigated using only keyboard. Tab order is broken in several areas.',
      location: 'Interactive elements',
      suggestion: 'Ensure all interactive elements are keyboard accessible. Add proper focus management and ARIA attributes for complex components.',
      codeSnippet: '<div role="menu" aria-label="Navigation menu">\n  <a href="#" role="menuitem" tabindex="0">Item</a>\n</div>',
    },
    // USABILITY - All Severities
    {
      category: 'usability',
      severity: 'critical',
      issue: 'No error handling for form submissions',
      description: 'Form submissions fail silently without user feedback, leaving users confused about whether their action was successful.',
      location: 'Contact form',
      suggestion: 'Implement clear error messages and success confirmations for all form submissions. Use visual feedback and ARIA live regions.',
      codeSnippet: '<div role="alert" aria-live="polite">\n  {error && <p className="error">Please check your input</p>}\n</div>',
    },
    {
      category: 'usability',
      severity: 'high',
      issue: 'Unclear call-to-action buttons',
      description: 'Primary CTA buttons lack visual distinction and clear labeling. Users may struggle to identify the main action on the page.',
      location: 'Main content area',
      suggestion: 'Enhance button visibility with stronger contrast, larger size, and action-oriented text like "Get Started" instead of generic "Click Here".',
      codeSnippet: '<button class="cta-primary">Get Started Free</button>',
    },
    {
      category: 'usability',
      severity: 'medium',
      issue: 'Mobile navigation menu not intuitive',
      description: 'The mobile hamburger menu lacks clear visual feedback when opened, and menu items are too small for touch targets (less than 44x44px).',
      location: 'Mobile navigation',
      suggestion: 'Increase touch target sizes to at least 44x44px and add visual indicators (animations, backdrop) when menu is open.',
      codeSnippet: '.mobile-menu-item {\n  min-height: 44px;\n  padding: 12px 16px;\n}',
    },
    {
      category: 'usability',
      severity: 'low',
      issue: 'Breadcrumb navigation missing',
      description: 'Multi-level pages lack breadcrumb navigation, making it difficult for users to understand their location and navigate back.',
      location: 'Page header',
      suggestion: 'Add breadcrumb navigation for pages deeper than 2 levels in the site hierarchy.',
      codeSnippet: '<nav aria-label="Breadcrumb">\n  <ol>\n    <li><a href="/">Home</a></li>\n    <li><a href="/products">Products</a></li>\n  </ol>\n</nav>',
    },
    // DESIGN - All Severities
    {
      category: 'design',
      severity: 'critical',
      issue: 'Inconsistent brand colors across pages',
      description: 'Primary brand color varies between #0066CC and #0077DD across different pages, creating visual inconsistency and brand confusion.',
      location: 'Site-wide',
      suggestion: 'Establish a design system with defined color palette and ensure consistent application across all pages and components.',
      codeSnippet: ':root {\n  --brand-primary: #0066CC;\n  --brand-secondary: #0077DD;\n}',
    },
    {
      category: 'design',
      severity: 'high',
      issue: 'Responsive breakpoints not optimized',
      description: 'Layout breaks at unexpected screen sizes due to inconsistent breakpoint usage, causing poor mobile and tablet experiences.',
      location: 'Responsive layout',
      suggestion: 'Define consistent breakpoint system (mobile: 768px, tablet: 1024px, desktop: 1280px) and test across all viewports.',
      codeSnippet: '@media (min-width: 768px) { /* Tablet */ }\n@media (min-width: 1024px) { /* Desktop */ }',
    },
    {
      category: 'design',
      severity: 'medium',
      issue: 'Inconsistent spacing between sections',
      description: 'Section spacing varies between 32px, 48px, and 64px without a clear pattern, creating visual inconsistency.',
      location: 'Page-wide',
      suggestion: 'Establish a consistent spacing scale (e.g., 8px base unit) and apply it consistently across all sections.',
      codeSnippet: '.section { margin-bottom: 4rem; } /* 64px consistent spacing */',
    },
    {
      category: 'design',
      severity: 'low',
      issue: 'Typography scale inconsistency',
      description: 'Heading sizes don\'t follow a consistent scale. H1 uses 48px while H2 uses 36px, but H3 jumps to 28px instead of maintaining ratio.',
      location: 'Typography system',
      suggestion: 'Establish a consistent typographic scale (e.g., 1.25x or 1.5x ratio) and apply it consistently across all heading levels.',
      codeSnippet: 'h1 { font-size: 3rem; }\nh2 { font-size: 2.25rem; }\nh3 { font-size: 1.875rem; }',
    },
    // PERFORMANCE - All Severities
    {
      category: 'performance',
      severity: 'critical',
      issue: 'Uncompressed images causing slow load times',
      description: 'Hero images are 2-3MB each without compression, causing 8-12 second load times on 3G connections and high bounce rates.',
      location: 'Hero section images',
      suggestion: 'Compress all images using tools like TinyPNG or ImageOptim. Target file sizes under 200KB for hero images.',
      codeSnippet: '<!-- Use compressed images -->\n<img src="hero-compressed.webp" alt="Description" loading="eager">',
    },
    {
      category: 'performance',
      severity: 'high',
      issue: 'Unoptimized images without WebP format',
      description: 'All images are served in JPEG/PNG format. Converting to WebP could reduce file sizes by 25-35%, improving page load times.',
      location: 'Image assets',
      suggestion: 'Convert images to WebP format with fallbacks for older browsers. Use responsive images with srcset.',
      codeSnippet: '<picture>\n  <source srcset="image.webp" type="image/webp">\n  <img src="image.jpg" alt="Description">\n</picture>',
    },
    {
      category: 'performance',
      severity: 'medium',
      issue: 'No lazy loading for below-fold images',
      description: 'All images load immediately, including those below the fold. This increases initial page load time unnecessarily.',
      location: 'Image gallery section',
      suggestion: 'Implement lazy loading for images below the fold using the loading="lazy" attribute or Intersection Observer API.',
      codeSnippet: '<img src="image.jpg" alt="Description" loading="lazy">',
    },
    {
      category: 'performance',
      severity: 'low',
      issue: 'Missing resource hints for external fonts',
      description: 'External Google Fonts load without preconnect hints, adding 200-300ms to font load time.',
      location: 'HTML head',
      suggestion: 'Add preconnect and dns-prefetch hints for external font resources to improve load performance.',
      codeSnippet: '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="dns-prefetch" href="https://fonts.gstatic.com">',
    },
    // SEO - All Severities
    {
      category: 'seo',
      severity: 'critical',
      issue: 'Missing meta description',
      description: 'The page lacks a meta description tag, which impacts search engine visibility and click-through rates from search results.',
      location: 'HTML head',
      suggestion: 'Add a compelling meta description (150-160 characters) that summarizes the page content and includes relevant keywords.',
      codeSnippet: '<meta name="description" content="Your compelling 150-character description here that includes key terms and value proposition.">',
    },
    {
      category: 'seo',
      severity: 'high',
      issue: 'Missing structured data (Schema.org)',
      description: 'The page lacks structured data markup, missing opportunities for rich snippets in search results.',
      location: 'HTML head',
      suggestion: 'Add JSON-LD structured data for Organization, WebSite, or Article schema depending on content type.',
      codeSnippet: '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Your Company"\n}\n</script>',
    },
    {
      category: 'seo',
      severity: 'medium',
      issue: 'Missing Open Graph tags for social sharing',
      description: 'No Open Graph meta tags are present, resulting in poor preview cards when the page is shared on social media platforms.',
      location: 'HTML head',
      suggestion: 'Add Open Graph meta tags (og:title, og:description, og:image) to improve social media sharing appearance.',
      codeSnippet: '<meta property="og:title" content="Page Title">\n<meta property="og:description" content="Page description">\n<meta property="og:image" content="image-url.jpg">',
    },
    {
      category: 'seo',
      severity: 'low',
      issue: 'Missing canonical URL',
      description: 'No canonical tag is specified, which may cause duplicate content issues if the page is accessible via multiple URLs.',
      location: 'HTML head',
      suggestion: 'Add a canonical URL tag to indicate the preferred version of the page for search engines.',
      codeSnippet: '<link rel="canonical" href="https://example.com/page">',
    },
  ];
};

export const generateMockResult = (url: string, mockFindings: AuditFinding[]): AuditResult => {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
  
  // Use the same improved scoring algorithm as the API route
  const criticalCount = mockFindings.filter(f => f.severity === 'critical').length;
  const highCount = mockFindings.filter(f => f.severity === 'high').length;
  const mediumCount = mockFindings.filter(f => f.severity === 'medium').length;
  const lowCount = mockFindings.filter(f => f.severity === 'low').length;
  
  const calculateOverallScore = () => {
    // Start with a very high base score (Lighthouse-style)
    // Well-built sites should score 90-100 even with some issues
    let score = 92;
    
    // Critical issues have moderate impact (not too harsh)
    // Each critical issue reduces score, but sites can still score well
    score -= Math.min(criticalCount * 5, 20); // Max 20 points for critical
    
    // High issues have very small impact
    // Sites can have many high issues and still score 85+
    score -= Math.min(highCount * 1.0, 10); // Max 10 points for high
    
    // Medium issues have minimal impact
    // These are very common and shouldn't penalize good sites
    score -= Math.min(mediumCount * 0.25, 6); // Max 6 points for medium
    
    // Low issues have almost no impact
    score -= Math.min(lowCount * 0.05, 1); // Max 1 point for low
    
    // Bonus system: Reward sites with good practices
    // If there are no critical issues, add significant bonus
    if (criticalCount === 0) {
      score += 5; // Bonus for no critical issues
    }
    
    // Additional bonus if high issues are minimal
    if (criticalCount === 0 && highCount <= 4) {
      score += Math.min(3, (5 - highCount) * 0.6); // Extra bonus for few high issues
    }
    
    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, Math.round(score)));
  };
  
  const summary = {
    totalIssues: mockFindings.length,
    critical: criticalCount,
    high: highCount,
    medium: mediumCount,
    low: lowCount,
    accessibility: mockFindings.filter(f => f.category === 'accessibility').length,
    usability: mockFindings.filter(f => f.category === 'usability').length,
    design: mockFindings.filter(f => f.category === 'design').length,
    performance: mockFindings.filter(f => f.category === 'performance').length,
    seo: mockFindings.filter(f => f.category === 'seo').length,
    overallScore: calculateOverallScore(),
  };

  const svgContent = url.toLowerCase().includes('sample.com')
    ? `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#1a2332"/><rect x="0" y="0" width="800" height="80" fill="#0a1628"/><rect x="20" y="20" width="120" height="40" fill="#14b8a6" rx="4"/><text x="400" y="50" font-family="Arial" font-size="24" fill="#14b8a6" text-anchor="middle">Sample.com</text><rect x="100" y="120" width="600" height="400" fill="#0a1628" rx="8"/><rect x="120" y="140" width="560" height="60" fill="#1a2332" rx="4"/><rect x="120" y="220" width="260" height="250" fill="#1a2332" rx="4"/><rect x="400" y="220" width="280" height="250" fill="#1a2332" rx="4"/><text x="400" y="550" font-family="Arial" font-size="20" fill="#14b8a6" text-anchor="middle">Sample.com Website Preview</text></svg>`
    : `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="600" fill="#1a2332"/><rect x="0" y="0" width="800" height="80" fill="#0a1628"/><rect x="20" y="20" width="120" height="40" fill="#14b8a6" rx="4"/><rect x="200" y="30" width="60" height="20" fill="#4a5568" rx="2"/><rect x="280" y="30" width="60" height="20" fill="#4a5568" rx="2"/><rect x="360" y="30" width="60" height="20" fill="#4a5568" rx="2"/><rect x="680" y="20" width="100" height="40" fill="#14b8a6" rx="4"/><rect x="100" y="120" width="600" height="300" fill="#0a1628" rx="8"/><rect x="120" y="140" width="560" height="40" fill="#1a2332" rx="4"/><rect x="120" y="200" width="260" height="180" fill="#1a2332" rx="4"/><rect x="400" y="200" width="280" height="180" fill="#1a2332" rx="4"/><rect x="100" y="440" width="600" height="40" fill="#1a2332" rx="4"/><text x="400" y="550" font-family="Arial" font-size="24" fill="#14b8a6" text-anchor="middle">Website Preview</text></svg>`;
  
  const placeholderScreenshot = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgContent);

  return {
    url: normalizedUrl,
    timestamp: new Date().toISOString(),
    findings: mockFindings,
    summary,
    screenshot: placeholderScreenshot,
  };
};
