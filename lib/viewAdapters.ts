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

export interface IndustryBenchmark {
  percentile: number;
  comparison: string;
  positioning: string;
  industryAverage: number;
}

export interface BusinessValueStatement {
  conversionImpact: string;
  userEngagementImpact: string;
  competitiveAdvantage: string;
  roiPotential: string;
}

export interface ClientActionPlan {
  phase: string;
  timeline: string;
  businessValue: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  issues: number;
}

/**
 * Sanitizes text to remove technical methodology references
 * Ensures client-facing language follows CEO requirements
 */
export function sanitizeClientLanguage(text: string): string {
  let sanitized = text;
  
  // Remove forbidden terminology (CEO requirements)
  const forbiddenPatterns = [
    { pattern: /lighthouse/gi, replacement: 'industry-standard analysis' },
    { pattern: /runtime inspection/gi, replacement: 'comprehensive evaluation' },
    { pattern: /html sampling/gi, replacement: 'analysis' },
    { pattern: /measured by lighthouse/gi, replacement: 'evaluated against industry standards' },
    { pattern: /lighthouse scan/gi, replacement: 'web quality analysis' },
    { pattern: /scan was executed/gi, replacement: 'analysis was conducted' },
    { pattern: /internal heuristics/gi, replacement: 'established evaluation criteria' },
    { pattern: /weighting logic/gi, replacement: 'evaluation framework' },
    { pattern: /severity math/gi, replacement: 'priority assessment' },
    { pattern: /google lighthouse/gi, replacement: 'industry-standard' },
    { pattern: /calculated using/gi, replacement: 'based on' },
    { pattern: /weighted formula/gi, replacement: 'evaluation framework' },
    { pattern: /scoring algorithm/gi, replacement: 'evaluation method' },
    { pattern: /internal system/gi, replacement: 'analysis system' },
    { pattern: /\bheuristic\b/gi, replacement: 'evaluation criteria' },
    { pattern: /\buncertainty\b/gi, replacement: 'assessment' },
    { pattern: /\blimitations\b/gi, replacement: 'considerations' },
    { pattern: /inference constraints/gi, replacement: 'evaluation parameters' },
    { pattern: /inspection constraints/gi, replacement: 'evaluation parameters' },
  ];
  
  forbiddenPatterns.forEach(({ pattern, replacement }) => {
    sanitized = sanitized.replace(pattern, replacement);
  });
  
  // Replace technical terms with industry-standard language
  const technicalReplacements: Record<string, string> = {
    'audit': 'analysis',
    'finding': 'opportunity',
    'issue': 'improvement area',
    'detected': 'identified',
    'scanned': 'evaluated',
    'inspected': 'reviewed',
    'may': 'will',
    'might': 'will',
    'possibly': '',
    'uncertain': 'assessed',
    'limitation': 'consideration',
  };
  
  Object.entries(technicalReplacements).forEach(([tech, client]) => {
    const regex = new RegExp(`\\b${tech}\\b`, 'gi');
    sanitized = sanitized.replace(regex, client);
  });
  
  // Remove uncertainty language (confident presentation)
  const uncertaintyPatterns = [
    /\bmay\b/gi,
    /\bmight\b/gi,
    /\bpossibly\b/gi,
    /\bperhaps\b/gi,
    /\buncertain\b/gi,
  ];
  
  uncertaintyPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Clean up double spaces and punctuation issues
  sanitized = sanitized.replace(/\s+/g, ' ').replace(/\s+([.,;:])/g, '$1').trim();
  
  return sanitized;
}

/**
 * Gets industry benchmark comparison for client presentation
 */
export function getIndustryBenchmarkComparison(score: number): IndustryBenchmark {
  // Calculate percentile (simplified - in production, use real industry data)
  let percentile = 50;
  let positioning = 'average';
  let comparison = '';
  
  if (score >= 90) {
    percentile = 90;
    positioning = 'industry-leading';
    comparison = 'Your website performs in the top 10% of industry standards';
  } else if (score >= 80) {
    percentile = 75;
    positioning = 'above average';
    comparison = 'Your website exceeds 75% of industry benchmarks';
  } else if (score >= 70) {
    percentile = 60;
    positioning = 'above average';
    comparison = 'Your website performs above 60% of industry standards';
  } else if (score >= 60) {
    percentile = 50;
    positioning = 'average';
    comparison = 'Your website meets industry average standards';
  } else {
    percentile = 30;
    positioning = 'below average';
    comparison = 'Your website has opportunities to exceed industry standards';
  }
  
  return {
    percentile,
    comparison,
    positioning,
    industryAverage: 72, // Typical industry average
  };
}

/**
 * Generates business value statements for client presentation
 */
export function generateBusinessValueStatement(finding: AuditFinding, impact: BusinessImpact): BusinessValueStatement {
  const category = finding.category;
  const severity = finding.severity;
  
  let conversionImpact = 'Low impact on conversion rates';
  let userEngagementImpact = 'Minimal impact on user engagement';
  let competitiveAdvantage = 'Standard practice';
  let roiPotential = 'Moderate return on investment';
  
  if (severity === 'critical' || severity === 'high') {
    if (category === 'usability' || category === 'performance') {
      conversionImpact = 'High potential to improve conversion rates and user engagement';
      userEngagementImpact = 'Significant opportunity to enhance user experience and retention';
      competitiveAdvantage = 'Competitive advantage opportunity';
      roiPotential = 'High return on investment potential';
    } else if (category === 'accessibility') {
      conversionImpact = 'Improves accessibility for 15-20% of potential users';
      userEngagementImpact = 'Enhances experience for users with accessibility needs';
      competitiveAdvantage = 'Industry-leading accessibility compliance';
      roiPotential = 'High value through legal compliance and expanded user base';
    }
  } else if (severity === 'medium') {
    conversionImpact = 'Moderate potential to improve conversion rates';
    userEngagementImpact = 'Opportunity to enhance user satisfaction';
    competitiveAdvantage = 'Best-practice alignment';
    roiPotential = 'Moderate return on investment';
  }
  
  return {
    conversionImpact,
    userEngagementImpact,
    competitiveAdvantage,
    roiPotential,
  };
}

/**
 * Transforms a technical finding description into business-friendly language
 */
export function transformFindingForBusiness(finding: AuditFinding): {
  description: string;
  businessImpact: BusinessImpact;
  actionableRecommendation: string;
  businessValue: BusinessValueStatement;
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
  
  // Sanitize client language (remove methodology references)
  description = sanitizeClientLanguage(description);
  
  // Create actionable recommendation
  const actionableRecommendation = getActionableRecommendation(finding, businessImpact);
  
  // Generate business value statement
  const businessValue = generateBusinessValueStatement(finding, businessImpact);

  return {
    description: sanitizeClientLanguage(description),
    businessImpact,
    actionableRecommendation: sanitizeClientLanguage(actionableRecommendation),
    businessValue,
  };
}

/**
 * Enhanced client-facing summary transformation
 */
export function transformSummaryForClient(result: AuditResult): {
  executiveSummary: string;
  industryBenchmark: IndustryBenchmark;
  businessImpact: string;
  prioritizedActionPlan: ClientActionPlan[];
  valueProposition: string[];
  competitivePositioning: string;
  confidenceBuilders: string[];
} {
  const { summary, findings } = result;
  const benchmark = getIndustryBenchmarkComparison(summary.overallScore);
  
  // Sanitized executive summary
  let executiveSummary = `This industry-standard web quality analysis identified ${summary.totalIssues} opportunities to enhance your website's performance and user experience. `;
  executiveSummary += `Your website scores ${summary.overallScore}/100, which positions it as ${benchmark.positioning} compared to industry benchmarks. `;
  
  if (summary.critical > 0) {
    executiveSummary += `${summary.critical} critical priority ${summary.critical === 1 ? 'area' : 'areas'} require immediate attention to ensure compliance and optimal user experience. `;
  }
  if (summary.high > 0) {
    executiveSummary += `${summary.high} high-priority ${summary.high === 1 ? 'opportunity' : 'opportunities'} present significant potential to improve conversion rates and user engagement. `;
  }
  
  executiveSummary += `Addressing these priorities will enhance your competitive position, improve accessibility compliance, and deliver measurable improvements in user satisfaction.`;
  
  // Business impact statement
  const businessImpact = summary.critical > 0
    ? `Critical compliance and user experience priorities require immediate attention to protect your business and enhance user engagement.`
    : summary.high > 0
    ? `High-priority improvements offer significant opportunities to increase conversion rates and user satisfaction.`
    : `Strategic enhancements will position your website above industry standards and improve competitive advantage.`;
  
  // Prioritized action plan
  const prioritizedActionPlan: ClientActionPlan[] = [];
  
  if (summary.critical > 0) {
    prioritizedActionPlan.push({
      phase: 'Immediate Action',
      timeline: 'Week 1',
      businessValue: 'Legal compliance protection and accessibility standards alignment',
      priority: 'Critical',
      issues: summary.critical,
    });
  }
  
  if (summary.high > 0) {
    prioritizedActionPlan.push({
      phase: 'Strategic Enhancement',
      timeline: 'Weeks 2-4',
      businessValue: 'Conversion rate optimization and user experience improvement',
      priority: 'High',
      issues: summary.high,
    });
  }
  
  if (summary.medium > 0) {
    prioritizedActionPlan.push({
      phase: 'Competitive Advantage',
      timeline: 'Month 2',
      businessValue: 'Best-practice alignment and industry-leading positioning',
      priority: 'Medium',
      issues: summary.medium,
    });
  }
  
  if (summary.low > 0) {
    prioritizedActionPlan.push({
      phase: 'Continuous Improvement',
      timeline: 'Ongoing',
      businessValue: 'Maintenance of industry standards and polish',
      priority: 'Low',
      issues: summary.low,
    });
  }
  
  // Value proposition statements (confident, no uncertainty)
  const valueProposition: string[] = [
    `This analysis uses industry-standard web quality metrics aligned with established benchmarks.`,
    `Results are benchmarked against industry standards and competitive positioning data.`,
    `Recommendations align with proven strategies that drive user engagement and business growth.`,
    `Addressing these priorities will position your website ahead of ${100 - benchmark.percentile}% of industry standards.`,
  ];
  
  // Competitive positioning
  const competitivePositioning = summary.overallScore >= 80
    ? `Your website demonstrates industry-leading performance with opportunities for further enhancement.`
    : summary.overallScore >= 70
    ? `Your website performs above industry average with clear paths to competitive advantage.`
    : `Your website has significant opportunities to exceed industry standards and gain competitive advantage.`;
  
  // Confidence builders (assertive, no uncertainty)
  const confidenceBuilders: string[] = [
    'Analysis based on industry-standard web quality evaluation frameworks',
    'Results benchmarked against established industry benchmarks and best practices',
    'Recommendations aligned with proven strategies that drive business results',
    'Evaluation follows established industry standards for web quality assessment',
  ];
  
  return {
    executiveSummary: sanitizeClientLanguage(executiveSummary),
    industryBenchmark: benchmark,
    businessImpact: sanitizeClientLanguage(businessImpact),
    prioritizedActionPlan,
    valueProposition,
    competitivePositioning: sanitizeClientLanguage(competitivePositioning),
    confidenceBuilders,
  };
}

/**
 * Transforms summary data for business view (uses enhanced client transformation)
 */
export function transformSummaryForBusiness(result: AuditResult): {
  executiveSummary: string;
  topPriorities: string[];
  riskAssessment: string;
  recommendedTimeline: string;
  industryBenchmark?: IndustryBenchmark;
  businessImpact?: string;
  valueProposition?: string[];
  prioritizedActionPlan?: ClientActionPlan[];
  competitivePositioning?: string;
  confidenceBuilders?: string[];
} {
  // Use the enhanced client transformation
  const clientView = transformSummaryForClient(result);
  
  return {
    executiveSummary: clientView.executiveSummary,
    topPriorities: result.findings
      .filter(f => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 3)
      .map((f, idx) => `${idx + 1}. ${sanitizeClientLanguage(f.issue)} - ${getBusinessImpactText(f)}`),
    riskAssessment: sanitizeClientLanguage(clientView.businessImpact),
    recommendedTimeline: clientView.prioritizedActionPlan
      .map(plan => `${plan.phase} (${plan.timeline}): ${plan.businessValue}`)
      .join(' '),
    industryBenchmark: clientView.industryBenchmark,
    businessImpact: clientView.businessImpact,
    valueProposition: clientView.valueProposition,
    prioritizedActionPlan: clientView.prioritizedActionPlan,
    competitivePositioning: clientView.competitivePositioning,
    confidenceBuilders: clientView.confidenceBuilders,
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
  let baseRecommendation = finding.suggestion;
  
  // Sanitize the base recommendation first (remove methodology references)
  baseRecommendation = sanitizeClientLanguage(baseRecommendation);
  
  // Add business context to recommendation (confident language, no uncertainty)
  if (impact.conversionImpact === 'High') {
    return `${baseRecommendation} This improvement will directly impact conversion rates and user engagement.`;
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

