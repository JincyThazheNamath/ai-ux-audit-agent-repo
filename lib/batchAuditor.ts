/**
 * Batch Auditor
 * Handles aggregation of multiple audit results
 */

import { AuditResult, AuditFinding } from '../types/audit';

export interface AggregatedAuditResult {
  baseUrl: string;
  timestamp: string;
  pageResults: AuditResult[];
  aggregatedSummary: {
    totalPages: number;
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
    averageScore: number;
  };
  findingsByCategory: {
    accessibility: AuditFinding[];
    usability: AuditFinding[];
    design: AuditFinding[];
    performance: AuditFinding[];
    seo: AuditFinding[];
  };
  findingsBySeverity: {
    critical: AuditFinding[];
    high: AuditFinding[];
    medium: AuditFinding[];
    low: AuditFinding[];
  };
}

export interface PageAuditResult {
  url: string;
  score: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalIssues: number;
  result: AuditResult;
}

/**
 * Aggregates multiple audit results into a comprehensive site-wide report
 */
export function aggregateAuditResults(
  results: AuditResult[],
  baseUrl: string
): AggregatedAuditResult {
  if (results.length === 0) {
    throw new Error('No audit results to aggregate');
  }

  // Combine all findings
  const allFindings: AuditFinding[] = [];
  results.forEach((result) => {
    allFindings.push(...result.findings);
  });

  // Aggregate summary counts
  const totalIssues = allFindings.length;
  const criticalCount = allFindings.filter(f => f.severity === 'critical').length;
  const highCount = allFindings.filter(f => f.severity === 'high').length;
  const mediumCount = allFindings.filter(f => f.severity === 'medium').length;
  const lowCount = allFindings.filter(f => f.severity === 'low').length;

  const accessibilityCount = allFindings.filter(f => f.category === 'accessibility').length;
  const usabilityCount = allFindings.filter(f => f.category === 'usability').length;
  const designCount = allFindings.filter(f => f.category === 'design').length;
  const performanceCount = allFindings.filter(f => f.category === 'performance').length;
  const seoCount = allFindings.filter(f => f.category === 'seo').length;

  // Calculate average score
  const totalScore = results.reduce((sum, result) => sum + result.summary.overallScore, 0);
  const averageScore = Math.round(totalScore / results.length);

  // Calculate overall aggregated score (weighted by page importance)
  const baseUrlObj = new URL(baseUrl);
  const homepageUrl = `${baseUrlObj.protocol}//${baseUrlObj.host}`;
  
  let weightedScore = 0;
  let totalWeight = 0;
  
  results.forEach((result) => {
    // Homepage gets 3x weight, other pages get 1x weight
    const weight = result.url === homepageUrl || result.url === baseUrl ? 3 : 1;
    weightedScore += result.summary.overallScore * weight;
    totalWeight += weight;
  });
  
  const overallScore = Math.round(weightedScore / totalWeight);

  // Group findings by category
  const findingsByCategory = {
    accessibility: allFindings.filter(f => f.category === 'accessibility'),
    usability: allFindings.filter(f => f.category === 'usability'),
    design: allFindings.filter(f => f.category === 'design'),
    performance: allFindings.filter(f => f.category === 'performance'),
    seo: allFindings.filter(f => f.category === 'seo'),
  };

  // Group findings by severity
  const findingsBySeverity = {
    critical: allFindings.filter(f => f.severity === 'critical'),
    high: allFindings.filter(f => f.severity === 'high'),
    medium: allFindings.filter(f => f.severity === 'medium'),
    low: allFindings.filter(f => f.severity === 'low'),
  };

  return {
    baseUrl,
    timestamp: new Date().toISOString(),
    pageResults: results,
    aggregatedSummary: {
      totalPages: results.length,
      totalIssues,
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
      accessibility: accessibilityCount,
      usability: usabilityCount,
      design: designCount,
      performance: performanceCount,
      seo: seoCount,
      overallScore,
      averageScore,
    },
    findingsByCategory,
    findingsBySeverity,
  };
}

/**
 * Sorts pages by severity (worst first)
 * Priority: Critical issues > High issues > Score (ascending)
 */
export function sortPagesBySeverity(results: AuditResult[]): PageAuditResult[] {
  const pageResults: PageAuditResult[] = results.map(result => ({
    url: result.url,
    score: result.summary.overallScore,
    criticalCount: result.summary.critical,
    highCount: result.summary.high,
    mediumCount: result.summary.medium,
    lowCount: result.summary.low,
    totalIssues: result.summary.totalIssues,
    result,
  }));

  // Sort: worst first
  return pageResults.sort((a, b) => {
    // First by critical issues (descending)
    if (a.criticalCount !== b.criticalCount) {
      return b.criticalCount - a.criticalCount;
    }
    // Then by high issues (descending)
    if (a.highCount !== b.highCount) {
      return b.highCount - a.highCount;
    }
    // Then by score (ascending - lower score = worse)
    return a.score - b.score;
  });
}

/**
 * Deduplicates findings across pages
 */
export function deduplicateFindings(findings: AuditFinding[]): AuditFinding[] {
  const seen = new Set<string>();
  const unique: AuditFinding[] = [];

  for (const finding of findings) {
    const signature = `${finding.category}:${finding.issue.toLowerCase().trim()}`;
    
    if (!seen.has(signature)) {
      seen.add(signature);
      unique.push(finding);
    }
  }

  return unique;
}






