import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';

interface School {
  name: string;
  location: string;
  metrics: Record<string, any>;
}

interface MetricsComparisonProps {
  schools: School[];
}

const METRICS_CONFIG = [
  { key: 'overall_score', label: 'Overall Score', format: (val: number) => val?.toFixed(1) || 'N/A' },
  { key: 'national_rank', label: 'National Rank', format: (val: number) => val ? `#${val}` : 'N/A' },
  { key: 'enrollment', label: 'Enrollment', format: (val: number) => val?.toLocaleString() || 'N/A' },
  { key: 'student_teacher_ratio', label: 'Student:Teacher Ratio', format: (val: string) => val || 'N/A' },
  { key: 'ap_participation_pct', label: 'AP Participation %', format: (val: number) => val ? `${val}%` : 'N/A' },
  { key: 'ap_pass_pct', label: 'AP Pass Rate %', format: (val: number) => val ? `${val}%` : 'N/A' },
  { key: 'math_proficiency_pct', label: 'Math Proficiency %', format: (val: number) => val ? `${val}%` : 'N/A' },
  { key: 'reading_proficiency_pct', label: 'Reading Proficiency %', format: (val: number) => val ? `${val}%` : 'N/A' },
  { key: 'science_proficiency_pct', label: 'Science Proficiency %', format: (val: number) => val ? `${val}%` : 'N/A' },
  { key: 'college_readiness_index', label: 'College Readiness Index', format: (val: number) => val ? `${val}%` : 'N/A' },
  { key: 'graduation_rate_pct', label: 'Graduation Rate %', format: (val: number) => val ? `${val}%` : 'N/A' }
];

export function MetricsComparison({ schools }: MetricsComparisonProps) {
  if (schools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>School Metrics Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Select schools to view detailed metrics comparison
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentYear = '2025';
  const SCHOOL_COLORS = ['bg-blue-100 text-blue-800', 'bg-amber-100 text-amber-800', 'bg-green-100 text-green-800'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Metrics Comparison ({currentYear})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-48">Metric</TableHead>
                {schools.map((school, index) => (
                  <TableHead key={school.name} className="min-w-32">
                    <div className="space-y-1">
                      <Badge variant="secondary" className={SCHOOL_COLORS[index % SCHOOL_COLORS.length]}>
                        School {index + 1}
                      </Badge>
                      <div className="text-sm font-medium">{school.name}</div>
                      <div className="text-xs text-muted-foreground">{school.location}</div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {METRICS_CONFIG.map((metric) => (
                <TableRow key={metric.key}>
                  <TableCell className="font-medium">{metric.label}</TableCell>
                  {schools.map((school) => {
                    const value = school.metrics[currentYear]?.[metric.key];
                    return (
                      <TableCell key={school.name}>
                        {metric.format(value)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}