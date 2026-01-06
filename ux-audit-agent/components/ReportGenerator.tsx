'use client';

import { AuditResult } from '../types/audit';

/**
 * Generates a professionally formatted audit report
 */
export function generateFormattedReport(result: AuditResult): string {
  const getSeverityEmoji = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626'; // red-600
      case 'high': return '#ea580c'; // orange-600
      case 'medium': return '#ca8a04'; // yellow-600
      case 'low': return '#16a34a'; // green-600
      default: return '#6b7280'; // gray-500
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'accessibility': return '♿';
      case 'usability': return '👆';
      case 'design': return '🎨';
      case 'performance': return '⚡';
      case 'seo': return '🔍';
      default: return '📋';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const criticalFindings = result.findings.filter(f => f.severity === 'critical');
  const highFindings = result.findings.filter(f => f.severity === 'high');
  const mediumFindings = result.findings.filter(f => f.severity === 'medium');
  const lowFindings = result.findings.filter(f => f.severity === 'low');

  const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UX Audit Report - ${result.url}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #ffffff;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: #ffffff;
    }
    
    .header {
      border-bottom: 4px solid #14b8a6;
      padding-bottom: 30px;
      margin-bottom: 40px;
    }
    
    .header h1 {
      font-size: 36px;
      font-weight: 700;
      color: #0a1628;
      margin-bottom: 10px;
    }
    
    .header-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 30px;
      margin-top: 20px;
      font-size: 14px;
      color: #6b7280;
    }
    
    .header-meta div {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .section {
      margin-bottom: 50px;
      page-break-inside: avoid;
    }
    
    .section-title {
      font-size: 24px;
      font-weight: 700;
      color: #0a1628;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    
    .executive-summary {
      background: #f9fafb;
      border-left: 4px solid #14b8a6;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 8px;
    }
    
    .executive-summary h3 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #0a1628;
    }
    
    .executive-summary ul {
      list-style: none;
      padding-left: 0;
    }
    
    .executive-summary li {
      margin-bottom: 10px;
      padding-left: 25px;
      position: relative;
    }
    
    .executive-summary li:before {
      content: "•";
      position: absolute;
      left: 0;
      color: #14b8a6;
      font-weight: bold;
      font-size: 20px;
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .metric-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    
    .metric-value {
      font-size: 32px;
      font-weight: 700;
      color: #0a1628;
      margin-bottom: 5px;
    }
    
    .metric-label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .score-card {
      background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 30px;
    }
    
    .score-value {
      font-size: 64px;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .score-label {
      font-size: 18px;
      opacity: 0.9;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    thead {
      background: #0a1628;
      color: white;
    }
    
    th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    td {
      padding: 15px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    
    tr:hover {
      background: #f9fafb;
    }
    
    .severity-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .category-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      background: #e5e7eb;
      color: #374151;
    }
    
    .finding-card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-left: 4px solid;
      border-radius: 8px;
      padding: 25px;
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    
    .finding-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 15px;
    }
    
    .finding-title {
      font-size: 18px;
      font-weight: 600;
      color: #0a1628;
      flex: 1;
    }
    
    .finding-meta {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
      font-size: 14px;
      color: #6b7280;
    }
    
    .finding-meta span {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .finding-section {
      margin-bottom: 15px;
    }
    
    .finding-section-title {
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .finding-section-content {
      color: #4b5563;
      line-height: 1.8;
    }
    
    .code-snippet {
      background: #1f2937;
      color: #f3f4f6;
      padding: 15px;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      overflow-x: auto;
      margin-top: 10px;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .summary-table {
      margin-top: 20px;
    }
    
    .conclusion {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      padding: 30px;
      border-radius: 8px;
      margin-top: 40px;
    }
    
    .conclusion h3 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #0a1628;
    }
    
    .next-steps {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 30px;
      border-radius: 8px;
      margin-top: 20px;
    }
    
    .next-steps h3 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #0a1628;
    }
    
    .next-steps ol {
      padding-left: 25px;
      margin-top: 15px;
    }
    
    .next-steps li {
      margin-bottom: 10px;
      color: #4b5563;
      line-height: 1.8;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 12px;
    }
    
    @media print {
      body {
        padding: 20px;
      }
      
      .section {
        page-break-inside: avoid;
      }
      
      .finding-card {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>UX Audit Report</h1>
      <div class="header-meta">
        <div><strong>Website:</strong> ${result.url}</div>
        <div><strong>Audit Date:</strong> ${formatDate(result.timestamp)}</div>
        <div><strong>Report ID:</strong> ${result.timestamp}</div>
      </div>
    </div>

    <!-- 1. Executive Summary -->
    <div class="section">
      <h2 class="section-title">1. Executive Summary</h2>
      <div class="executive-summary">
        <h3>Key Findings</h3>
        <ul>
          <li><strong>Total Issues Identified:</strong> ${result.summary.totalIssues} across 5 categories</li>
          <li><strong>Critical Issues:</strong> ${result.summary.critical} requiring immediate attention</li>
          <li><strong>High Priority Issues:</strong> ${result.summary.high} affecting user experience</li>
          <li><strong>Overall UX Score:</strong> <strong>${result.summary.overallScore}/100</strong></li>
        </ul>
        
        <h3 style="margin-top: 25px;">Risk Assessment</h3>
        <ul>
          ${result.summary.critical > 0 ? `<li><strong>🔴 High Risk:</strong> ${result.summary.critical} critical issues pose significant accessibility and usability barriers</li>` : ''}
          ${result.summary.high > 0 ? `<li><strong>🟠 Medium-High Risk:</strong> ${result.summary.high} high-priority issues impact user experience and conversion</li>` : ''}
          ${result.summary.medium > 0 ? `<li><strong>🟡 Medium Risk:</strong> ${result.summary.medium} medium-priority issues should be addressed in next iteration</li>` : ''}
          ${result.summary.low > 0 ? `<li><strong>🟢 Low Risk:</strong> ${result.summary.low} low-priority issues are minor improvements</li>` : ''}
        </ul>
        
        <h3 style="margin-top: 25px;">Top Recommendations</h3>
        <ul>
          ${criticalFindings.length > 0 ? `<li>Address ${criticalFindings.length} critical ${criticalFindings.length === 1 ? 'issue' : 'issues'} immediately to ensure accessibility compliance</li>` : ''}
          ${highFindings.length > 0 ? `<li>Prioritize ${highFindings.length} high-priority ${highFindings.length === 1 ? 'issue' : 'issues'} affecting user experience</li>` : ''}
          <li>Implement systematic fixes across all ${result.summary.totalIssues} identified issues</li>
          <li>Establish ongoing monitoring and testing protocols</li>
        </ul>
      </div>
    </div>

    <!-- 2. Audit Scope -->
    <div class="section">
      <h2 class="section-title">2. Audit Scope</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${result.summary.totalIssues}</div>
          <div class="metric-label">Total Issues</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${result.summary.critical}</div>
          <div class="metric-label">Critical</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${result.summary.high}</div>
          <div class="metric-label">High</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${result.summary.medium}</div>
          <div class="metric-label">Medium</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${result.summary.low}</div>
          <div class="metric-label">Low</div>
        </div>
      </div>
      
      <div class="score-card">
        <div class="score-value">${result.summary.overallScore}</div>
        <div class="score-label">Overall UX Score / 100</div>
      </div>
      
      <h3 style="font-size: 18px; margin-bottom: 15px; color: #374151;">Categories Analyzed</h3>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Issues Found</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>♿ Accessibility</td>
            <td><strong>${result.summary.accessibility}</strong></td>
            <td>${result.summary.accessibility > 0 ? '⚠️ Issues Found' : '✅ No Issues'}</td>
          </tr>
          <tr>
            <td>👆 Usability</td>
            <td><strong>${result.summary.usability}</strong></td>
            <td>${result.summary.usability > 0 ? '⚠️ Issues Found' : '✅ No Issues'}</td>
          </tr>
          <tr>
            <td>🎨 Design</td>
            <td><strong>${result.summary.design}</strong></td>
            <td>${result.summary.design > 0 ? '⚠️ Issues Found' : '✅ No Issues'}</td>
          </tr>
          <tr>
            <td>⚡ Performance</td>
            <td><strong>${result.summary.performance}</strong></td>
            <td>${result.summary.performance > 0 ? '⚠️ Issues Found' : '✅ No Issues'}</td>
          </tr>
          <tr>
            <td>🔍 SEO</td>
            <td><strong>${result.summary.seo}</strong></td>
            <td>${result.summary.seo > 0 ? '⚠️ Issues Found' : '✅ No Issues'}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 3. Summary Table -->
    <div class="section">
      <h2 class="section-title">3. Summary of Audit Observations</h2>
      <table class="summary-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Issue</th>
            <th>Category</th>
            <th>Severity</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          ${result.findings.map((finding, index) => `
            <tr>
              <td><strong>${index + 1}</strong></td>
              <td>${finding.issue}</td>
              <td><span class="category-badge">${getCategoryIcon(finding.category)} ${finding.category}</span></td>
              <td><span class="severity-badge" style="background: ${getSeverityColor(finding.severity)}20; color: ${getSeverityColor(finding.severity)};">${getSeverityEmoji(finding.severity)} ${finding.severity}</span></td>
              <td>${finding.location}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- 4. Detailed Findings -->
    <div class="section">
      <h2 class="section-title">4. Detailed Findings</h2>
      ${result.findings.map((finding, index) => `
        <div class="finding-card" style="border-left-color: ${getSeverityColor(finding.severity)};">
          <div class="finding-header">
            <span style="font-size: 24px;">${getSeverityEmoji(finding.severity)}</span>
            <div class="finding-title">${index + 1}. ${finding.issue}</div>
          </div>
          
          <div class="finding-meta">
            <span><strong>Category:</strong> ${getCategoryIcon(finding.category)} ${finding.category}</span>
            <span><strong>Severity:</strong> <span class="severity-badge" style="background: ${getSeverityColor(finding.severity)}20; color: ${getSeverityColor(finding.severity)};">${finding.severity.toUpperCase()}</span></span>
            <span><strong>Location:</strong> ${finding.location}</span>
          </div>
          
          <div class="finding-section">
            <div class="finding-section-title">Description</div>
            <div class="finding-section-content">${finding.description}</div>
          </div>
          
          <div class="finding-section">
            <div class="finding-section-title">Impact</div>
            <div class="finding-section-content">
              ${finding.severity === 'critical' ? '🔴 <strong>Critical Impact:</strong> This issue significantly impacts accessibility compliance, user experience, or functionality. Immediate action required.' : ''}
              ${finding.severity === 'high' ? '🟠 <strong>High Impact:</strong> This issue affects user experience and may impact conversion rates or user satisfaction.' : ''}
              ${finding.severity === 'medium' ? '🟡 <strong>Medium Impact:</strong> This issue should be addressed to improve overall user experience and best practices.' : ''}
              ${finding.severity === 'low' ? '🟢 <strong>Low Impact:</strong> This is a minor improvement that enhances polish and best practices.' : ''}
            </div>
          </div>
          
          <div class="finding-section">
            <div class="finding-section-title">Recommendation</div>
            <div class="finding-section-content">${finding.suggestion}</div>
          </div>
          
          ${finding.codeSnippet ? `
            <div class="finding-section">
              <div class="finding-section-title">Code Example</div>
              <div class="code-snippet">${finding.codeSnippet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>

    <!-- 5. Conclusion -->
    <div class="section">
      <h2 class="section-title">5. Conclusion</h2>
      <div class="conclusion">
        <h3>Summary</h3>
        <p style="line-height: 1.8; color: #4b5563;">
          This audit identified <strong>${result.summary.totalIssues} issues</strong> across five key UX categories. 
          The website received an overall UX score of <strong>${result.summary.overallScore}/100</strong>, indicating 
          ${result.summary.overallScore >= 80 ? 'strong performance with room for improvement' : 
            result.summary.overallScore >= 60 ? 'moderate performance requiring attention' : 
            'significant areas requiring improvement'}.
        </p>
        <p style="line-height: 1.8; color: #4b5563; margin-top: 15px;">
          ${result.summary.critical > 0 ? `<strong>Priority Action:</strong> Address ${result.summary.critical} critical ${result.summary.critical === 1 ? 'issue' : 'issues'} immediately to ensure accessibility compliance and prevent user barriers. ` : ''}
          ${result.summary.high > 0 ? `Additionally, ${result.summary.high} high-priority ${result.summary.high === 1 ? 'issue' : 'issues'} should be prioritized in the next development cycle. ` : ''}
          Systematic implementation of the recommendations provided will significantly improve user experience, accessibility compliance, and overall site performance.
        </p>
      </div>
    </div>

    <!-- 6. Next Steps -->
    <div class="section">
      <h2 class="section-title">6. Next Steps</h2>
      <div class="next-steps">
        <h3>Recommended Action Plan</h3>
        <ol>
          ${result.summary.critical > 0 ? `<li><strong>Immediate (Week 1):</strong> Address all ${result.summary.critical} critical issues to ensure accessibility compliance</li>` : ''}
          ${result.summary.high > 0 ? `<li><strong>Short-term (Weeks 2-4):</strong> Resolve ${result.summary.high} high-priority issues affecting user experience</li>` : ''}
          ${result.summary.medium > 0 ? `<li><strong>Medium-term (Month 2):</strong> Address ${result.summary.medium} medium-priority issues during next sprint</li>` : ''}
          ${result.summary.low > 0 ? `<li><strong>Long-term (Ongoing):</strong> Incorporate ${result.summary.low} low-priority improvements into regular maintenance</li>` : ''}
          <li><strong>Testing:</strong> Conduct follow-up audit after implementing fixes</li>
          <li><strong>Monitoring:</strong> Establish ongoing UX monitoring and testing protocols</li>
        </ol>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>Generated by AI UX Audit Agent</strong></p>
      <p>Report ID: ${result.timestamp} | Audit Date: ${formatDate(result.timestamp)}</p>
      <p style="margin-top: 10px;">This report is suitable for printing, PDF export, and sharing with stakeholders.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return htmlReport;
}

/**
 * Downloads the report as HTML file
 */
export function downloadReportAsHTML(result: AuditResult) {
  const htmlReport = generateFormattedReport(result);
  const blob = new Blob([htmlReport], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ux-audit-report-${result.url.replace(/https?:\/\//, '').replace(/\//g, '-')}-${Date.now()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Opens report in new window for printing/PDF
 */
export function openReportForPrint(result: AuditResult) {
  const htmlReport = generateFormattedReport(result);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlReport);
    printWindow.document.close();
    // Wait for content to load, then trigger print dialog
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}




