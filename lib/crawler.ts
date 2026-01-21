/**
 * Website Crawler Library
 * Depth-based crawling with navigation structure parsing
 */

interface CrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  includeSubdomains?: boolean;
  respectRobotsTxt?: boolean;
}

interface CrawledPage {
  url: string;
  depth: number;
  parentUrl?: string;
  title?: string;
}

/**
 * Normalizes a URL to ensure it's absolute and has a protocol
 */
function normalizeUrl(url: string, baseUrl: string): string {
  try {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    }
    const base = new URL(baseUrl);
    return new URL(url, baseUrl).toString();
  } catch {
    return '';
  }
}

/**
 * Checks if a URL belongs to the same domain
 */
function isSameDomain(url: string, baseDomain: string, includeSubdomains: boolean = false): boolean {
  try {
    const urlObj = new URL(url);
    const baseObj = new URL(baseDomain);
    
    if (includeSubdomains) {
      const urlHost = urlObj.hostname;
      const baseHost = baseObj.hostname;
      return urlHost === baseHost || urlHost.endsWith('.' + baseHost);
    }
    
    return urlObj.hostname === baseObj.hostname;
  } catch {
    return false;
  }
}

/**
 * Checks if URL should be excluded (fragments, mailto, tel, etc.)
 */
function shouldExcludeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.protocol === 'mailto:' ||
      urlObj.protocol === 'tel:' ||
      urlObj.protocol === 'javascript:' ||
      urlObj.hash.length > 0 // Exclude URLs with fragments
    );
  } catch {
    return true;
  }
}

/**
 * Extracts navigation links from a page
 * Focuses on main navigation, footer, and content links
 */
async function extractNavigationLinks(pageUrl: string, html: string): Promise<string[]> {
  const links: Set<string> = new Set();
  
  try {
    // Extract links from navigation elements (nav, header, footer)
    const navRegex = /<(nav|header|footer)[^>]*>[\s\S]*?<\/\1>/gi;
    const navMatches = html.match(navRegex) || [];
    
    for (const navSection of navMatches) {
      const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
      let match;
      while ((match = linkRegex.exec(navSection)) !== null) {
        const href = match[1].trim();
        if (href) {
          const normalizedUrl = normalizeUrl(href, pageUrl);
          if (normalizedUrl && !shouldExcludeUrl(normalizedUrl)) {
            links.add(normalizedUrl);
          }
        }
      }
    }
    
    // Also extract main content links (for depth 2+)
    const contentLinkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let contentMatch;
    while ((contentMatch = contentLinkRegex.exec(html)) !== null) {
      const href = contentMatch[1].trim();
      if (href) {
        const normalizedUrl = normalizeUrl(href, pageUrl);
        if (normalizedUrl && !shouldExcludeUrl(normalizedUrl)) {
          links.add(normalizedUrl);
        }
      }
    }
    
    return Array.from(links);
  } catch (error) {
    console.error(`Error extracting links from ${pageUrl}:`, error);
    return [];
  }
}

/**
 * Fetches and parses a sitemap.xml file
 */
export async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  const urls: string[] = [];
  
  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UXAuditBot/1.0)',
      },
    });
    
    if (!response.ok) {
      return urls;
    }
    
    const xmlText = await response.text();
    const locRegex = /<loc>(.*?)<\/loc>/gi;
    let match;
    
    while ((match = locRegex.exec(xmlText)) !== null) {
      const url = match[1].trim();
      if (url) {
        urls.push(url);
      }
    }
    
    return urls;
  } catch (error) {
    console.error('Error parsing sitemap:', error);
    return urls;
  }
}

/**
 * Tries to find sitemap.xml URL for a given website
 */
export async function findSitemap(baseUrl: string): Promise<string | null> {
  const baseUrlObj = new URL(baseUrl);
  const commonSitemapPaths = [
    '/sitemap.xml',
    '/sitemap_index.xml',
    '/sitemap-index.xml',
  ];
  
  for (const path of commonSitemapPaths) {
    try {
      const sitemapUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}${path}`;
      const response = await fetch(sitemapUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; UXAuditBot/1.0)',
        },
      });
      
      if (response.ok) {
        return sitemapUrl;
      }
    } catch {
      continue;
    }
  }
  
  return null;
}

/**
 * Crawls a page and extracts links with depth tracking
 */
async function crawlPageWithDepth(
  pageUrl: string,
  baseDomain: string,
  currentDepth: number,
  maxDepth: number,
  options: CrawlOptions
): Promise<{ links: string[], title?: string }> {
  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; UXAuditBot/1.0)',
      },
    });
    
    if (!response.ok) {
      return { links: [] };
    }
    
    const html = await response.text();
    
    // Extract page title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;
    
    // Extract links based on depth
    let links: string[];
    if (currentDepth === 0) {
      // Depth 0 (homepage): Extract navigation links
      links = await extractNavigationLinks(pageUrl, html);
    } else if (currentDepth === 1) {
      // Depth 1 (Nav): Extract navigation and main content links
      links = await extractNavigationLinks(pageUrl, html);
    } else {
      // Depth 2+ (Subnav): Extract all links
      links = await extractNavigationLinks(pageUrl, html);
    }
    
    // Filter to same domain
    const filteredLinks = links.filter(link => 
      isSameDomain(link, baseDomain, options.includeSubdomains || false)
    );
    
    return { links: filteredLinks, title };
  } catch (error) {
    console.error(`Error crawling page ${pageUrl}:`, error);
    return { links: [] };
  }
}

/**
 * Discovers pages using depth-based crawling
 * Structure: Home (depth 0) => Nav (depth 1) => Subnav (depth 2)
 */
export async function discoverPagesWithDepth(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<CrawledPage[]> {
  const {
    maxPages = 40,
    maxDepth = 3,
    includeSubdomains = false,
  } = options;
  
  const discoveredPages: Map<string, CrawledPage> = new Map();
  const toVisit: Array<{ url: string; depth: number; parentUrl?: string }> = [];
  
  // Normalize start URL
  let baseUrl: string;
  try {
    baseUrl = startUrl.startsWith('http') ? startUrl : `https://${startUrl}`;
    new URL(baseUrl);
  } catch {
    throw new Error('Invalid URL provided');
  }
  
  // Strategy 1: Try sitemap first (faster and more comprehensive)
  try {
    const sitemapUrl = await findSitemap(baseUrl);
    if (sitemapUrl) {
      console.log(`Found sitemap: ${sitemapUrl}`);
      const sitemapUrls = await parseSitemap(sitemapUrl);
      
      // Filter and limit pages from sitemap
      let count = 0;
      for (const url of sitemapUrls) {
        if (count >= maxPages) break;
        
        if (isSameDomain(url, baseUrl, includeSubdomains)) {
          discoveredPages.set(url, {
            url,
            depth: 0, // Sitemap pages are treated as depth 0
          });
          count++;
        }
      }
      
      if (discoveredPages.size > 0) {
        console.log(`Discovered ${discoveredPages.size} pages from sitemap`);
        return Array.from(discoveredPages.values()).slice(0, maxPages);
      }
    }
  } catch (error) {
    console.error('Sitemap discovery failed, falling back to depth-based crawling:', error);
  }
  
  // Strategy 2: Depth-based crawling (fallback)
  // Start with homepage
  toVisit.push({ url: baseUrl, depth: 0 });
  discoveredPages.set(baseUrl, {
    url: baseUrl,
    depth: 0,
  });
  
  while (toVisit.length > 0 && discoveredPages.size < maxPages) {
    const current = toVisit.shift()!;
    
    if (current.depth >= maxDepth) {
      continue; // Skip if we've reached max depth
    }
    
    const { links, title } = await crawlPageWithDepth(
      current.url,
      baseUrl,
      current.depth,
      maxDepth,
      options
    );
    
    // Update title if found
    if (title && discoveredPages.has(current.url)) {
      const page = discoveredPages.get(current.url)!;
      page.title = title;
    }
    
    // Add new links to visit queue
    for (const link of links) {
      if (discoveredPages.size >= maxPages) break;
      
      if (!discoveredPages.has(link) && current.depth < maxDepth) {
        discoveredPages.set(link, {
          url: link,
          depth: current.depth + 1,
          parentUrl: current.url,
        });
        
        // Add to queue if we haven't reached max depth
        if (current.depth + 1 < maxDepth && toVisit.length < 50) {
          toVisit.push({
            url: link,
            depth: current.depth + 1,
            parentUrl: current.url,
          });
        }
      }
    }
  }
  
  console.log(`Discovered ${discoveredPages.size} pages via depth-based crawling`);
  return Array.from(discoveredPages.values()).slice(0, maxPages);
}







