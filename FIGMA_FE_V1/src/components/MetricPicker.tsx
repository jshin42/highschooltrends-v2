import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface MetricPickerProps {
  selectedMetric: string;
  onMetricChange: (metric: string) => void;
}

const METRICS = [
  { value: 'overall_score', label: 'Overall Score' },
  { value: 'national_rank', label: 'National Rank' },
  { value: 'enrollment', label: 'Enrollment' },
  { value: 'ap_participation_pct', label: 'AP Participation %' },
  { value: 'ap_pass_pct', label: 'AP Pass Rate %' },
  { value: 'math_proficiency_pct', label: 'Math Proficiency %' },
  { value: 'reading_proficiency_pct', label: 'Reading Proficiency %' },
  { value: 'science_proficiency_pct', label: 'Science Proficiency %' },
  { value: 'college_readiness_index', label: 'College Readiness Index' },
  { value: 'graduation_rate_pct', label: 'Graduation Rate %' }
];

export function MetricPicker({ selectedMetric, onMetricChange }: MetricPickerProps) {
  return (
    <div className="space-y-2">
      <label className="block">Select Metric</label>
      <Select value={selectedMetric} onValueChange={onMetricChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choose a metric..." />
        </SelectTrigger>
        <SelectContent>
          {METRICS.map((metric) => (
            <SelectItem key={metric.value} value={metric.value}>
              {metric.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}