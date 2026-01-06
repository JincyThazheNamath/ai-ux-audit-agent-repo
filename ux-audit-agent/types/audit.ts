export interface AuditFinding {
  category: 'accessibility' | 'usability' | 'design' | 'performance' | 'seo';
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  description: string;
  location: string;
  suggestion: string;
  codeSnippet?: string;
}

export interface AuditResult {
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






