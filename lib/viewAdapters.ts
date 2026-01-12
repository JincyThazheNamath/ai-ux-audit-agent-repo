import { AuditFinding, AuditResult } from '../types/audit';

/**
 * View Adapters for transforming audit data between Professional and Business views
 * 
 * These functions transform technical findings into business-friendly language
 * while maintaining the same underlying data structure.
 */

export interface BusinessImpact {
  userImpact: string; // e.g., "15% of users"
  conversionImpact: 'High' | 'Medium' | 'Low';
  complianceRisk: 'Critical' | 'High' | 'Medium' | 'Low';
  priorityScore: number; // 1-10
}

/**
 * Transforms a technical finding description into business-friendly language
 */
export function transformFindingForBusiness(finding: AuditFinding): {
  description: string;
  businessImpact: BusinessImpact;
  actionableRecommendation: string;
} {
  const severity = finding.severity;
  const category = finding.category;

  // Calculate business impact based on severity and category
  const businessImpact: BusinessImpact = {
    userImpact: getEstimatedUserImpact(severity, category),
    conversionImpact: getConversionImpact(severity, category),
    complianceRisk: getComplianceRisk(severity, category),
    priorityScore: getPriorityScore(severity, category),
  };

  // Transform technical description to business language
  let description = finding.description;
  
  // Replace technical jargon with business-friendly terms
  const replacements: Record<string, string> = {
    'alt text': 'image descriptions for accessibility',
    'ARIA labels': 'accessibility labels',
    'color contrast ratio': 'text readability',
    'WCAG compliance': 'accessibility standards compliance',
    'semantic HTML': 'proper page structure',
    'meta tags': 'search engine optimization tags',
    'viewport': 'mobile device compatibility',
    'keyboard navigation': 'keyboard accessibility',
  };

  Object.entries(replacements).forEach(([tech, business]) => {
    description = description.replace(new RegExp(tech, 'gi'), business);
  });

  // Create actionable recommendation
  const actionableRecommendation = getActionableRecommendation(finding, businessImpact);

  return {
    description,
    businessImpact,
    actionableRecommendation,
  };
}

/**
 * Transforms summary data for business view
 */
export function transformSummaryForBusiness(result: AuditResult): {
  executiveSummary: string;
  topPriorities: string[];
  riskAssessment: string;
  recommendedTimeline: string;
} {
  const { summary, findings } = result;

  // Executive summary
  const executiveSummary = `This audit identified ${summary.totalIssues} issues affecting your website's user experience and business performance. ` +
    `The overall UX score is ${summary.overallScore}/100. ` +
    `${summary.critical > 0 ? `${summary.critical} critical issue${summary.critical === 1 ? '' : 's'} require immediate attention. ` : ''}` +
    `${summary.high > 0 ? `${summary.high} high-priority issue${summary.high === 1 ? '' : 's'} impact user experience and conversion. ` : ''}` +
    `Addressing these issues will improve accessibility compliance, user satisfaction, and overall site performance.`;

  // Top priorities (top 3 critical/high issues)
  const topPriorities = findings
    .filter(f => f.severity === 'critical' || f.severity === 'high')
    .slice(0, 3)
    .map((f, idx) => `${idx + 1}. ${f.issue} - ${getBusinessImpactText(f)}`);

  // Risk assessment
  let riskAssessment = '';
  if (summary.critical > 0) {
    riskAssessment = `🔴 High Risk: ${summary.critical} critical issue${summary.critical === 1 ? '' : 's'} pose significant accessibility barriers and compliance risks.`;
  } else if (summary.high > 0) {
    riskAssessment = `🟠 Medium-High Risk: ${summary.high} high-priority issue${summary.high === 1 ? '' : 's'} impact user experience and may affect conversion rates.`;
  } else if (summary.medium > 0) {
    riskAssessment = `🟡 Medium Risk: ${summary.medium} medium-priority issue${summary.medium === 1 ? '' : 's'} should be addressed to improve overall user experience.`;
  } else {
    riskAssessment = `🟢 Low Risk: Only minor improvements needed.`;
  }

  // Recommended timeline
  let recommendedTimeline = '';
  if (summary.critical > 0) {
    recommendedTimeline = `Immediate (Week 1): Address ${summary.critical} critical issue${summary.critical === 1 ? '' : 's'}. `;
  }
  if (summary.high > 0) {
    recommendedTimeline += `Short-term (Weeks 2-4): Resolve ${summary.high} high-priority issue${summary.high === 1 ? '' : 's'}. `;
  }
  if (summary.medium > 0) {
    recommendedTimeline += `Medium-term (Month 2): Address ${summary.medium} medium-priority issue${summary.medium === 1 ? '' : 's'}.`;
  }
  if (!recommendedTimeline) {
    recommendedTimeline = 'Ongoing: Incorporate improvements into regular maintenance.';
  }

  return {
    executiveSummary,
    topPriorities,
    riskAssessment,
    recommendedTimeline,
  };
}

/**
 * Helper function to get estimated user impact
 */
function getEstimatedUserImpact(severity: string, category: string): string {
  const impactMap: Record<string, Record<string, string>> = {
    critical: {
      accessibility: '15-20% of users',
      usability: '20-30% of users',
      design: '10-15% of users',
      performance: '25-35% of users',
      seo: '5-10% of users',
    },
    high: {
      accessibility: '10-15% of users',
      usability: '15-20% of users',
      design: '8-12% of users',
      performance: '15-25% of users',
      seo: '3-8% of users',
    },
    medium: {
      accessibility: '5-10% of users',
      usability: '8-12% of users',
      design: '5-8% of users',
      performance: '8-15% of users',
      seo: '2-5% of users',
    },
    low: {
      accessibility: '2-5% of users',
      usability: '3-5% of users',
      design: '2-5% of users',
      performance: '3-8% of users',
      seo: '1-3% of users',
    },
  };

  return impactMap[severity]?.[category] || 'Some users';
}

/**
 * Helper function to get conversion impact
 */
function getConversionImpact(severity: string, category: string): 'High' | 'Medium' | 'Low' {
  if (severity === 'critical') return 'High';
  if (severity === 'high' && (category === 'usability' || category === 'performance')) return 'High';
  if (severity === 'high') return 'Medium';
  if (severity === 'medium' && category === 'usability') return 'Medium';
  return 'Low';
}

/**
 * Helper function to get compliance risk
 */
function getComplianceRisk(severity: string, category: string): 'Critical' | 'High' | 'Medium' | 'Low' {
  if (severity === 'critical' && category === 'accessibility') return 'Critical';
  if (severity === 'critical') return 'High';
  if (severity === 'high' && category === 'accessibility') return 'High';
  if (severity === 'high') return 'Medium';
  if (severity === 'medium' && category === 'accessibility') return 'Medium';
  return 'Low';
}

/**
 * Helper function to get priority score (1-10)
 */
function getPriorityScore(severity: string, category: string): number {
  const baseScore: Record<string, number> = {
    critical: 9,
    high: 7,
    medium: 5,
    low: 3,
  };

  const categoryBonus: Record<string, number> = {
    accessibility: 1,
    usability: 0.5,
    performance: 0.5,
    design: 0,
    seo: 0,
  };

  return Math.min(10, Math.round(baseScore[severity] + (categoryBonus[category] || 0)));
}

/**
 * Helper function to get actionable recommendation
 */
function getActionableRecommendation(finding: AuditFinding, impact: BusinessImpact): string {
  const baseRecommendation = finding.suggestion;
  
  // Add business context to recommendation
  if (impact.conversionImpact === 'High') {
    return `${baseRecommendation} This fix will directly impact conversion rates and user engagement.`;
  }
  if (impact.complianceRisk === 'Critical' || impact.complianceRisk === 'High') {
    return `${baseRecommendation} This is critical for accessibility compliance and legal risk mitigation.`;
  }
  
  return baseRecommendation;
}

/**
 * Helper function to get business impact text
 */
function getBusinessImpactText(finding: AuditFinding): string {
  const impact = getConversionImpact(finding.severity, finding.category);
  const risk = getComplianceRisk(finding.severity, finding.category);
  
  if (risk === 'Critical') {
    return 'Critical compliance risk';
  }
  if (impact === 'High') {
    return 'High conversion impact';
  }
  if (risk === 'High') {
    return 'High compliance risk';
  }
  return 'Moderate impact';
}

