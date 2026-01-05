'use client';

import { Filter } from 'lucide-react';

interface FilterDropdownProps {
  filterCategory: string;
  filterSeverity: string;
  onCategoryChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  filteredCount: number;
}

/**
 * Provides filtering controls for audit findings by category and severity.
 * Displays the count of filtered findings and allows users to filter by category and severity.
 */
export default function FilterDropdown({
  filterCategory,
  filterSeverity,
  onCategoryChange,
  onSeverityChange,
  filteredCount,
}: FilterDropdownProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
      <h2 className="text-2xl font-bold text-white">
        Findings ({filteredCount})
      </h2>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="bg-[#0a1628] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Categories</option>
            <option value="accessibility">♿ Accessibility</option>
            <option value="usability">👆 Usability</option>
            <option value="design">🎨 Design</option>
            <option value="performance">⚡ Performance</option>
            <option value="seo">🔍 SEO</option>
          </select>
        </div>
        <select
          value={filterSeverity}
          onChange={(e) => onSeverityChange(e.target.value)}
          className="bg-[#0a1628] border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
    </div>
  );
}

