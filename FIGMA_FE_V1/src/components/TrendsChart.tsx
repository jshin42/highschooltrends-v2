import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface School {
  name: string;
  location: string;
  metrics: Record<string, any>;
}

interface TrendsChartProps {
  schools: School[];
  metric: string;
}

const SCHOOL_COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'];

export function TrendsChart({ schools, metric }: TrendsChartProps) {
  if (schools.length === 0 || !metric) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">Select schools and a metric to view trends</p>
      </div>
    );
  }

  // Prepare data for the chart
  const years = ['2019', '2020', '2021', '2022', '2023', '2024', '2025'];
  const chartData = years.map(year => {
    const dataPoint: any = { year };
    schools.forEach((school, index) => {
      const value = school.metrics[year]?.[metric];
      if (value !== undefined) {
        dataPoint[school.name] = value;
      }
    });
    return dataPoint;
  });

  // Calculate Y-axis domain with improved logic
  const allValues = chartData.flatMap(d => 
    schools.map(school => d[school.name]).filter(v => v !== undefined && v !== null)
  );
  
  if (allValues.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">No data available for the selected metric</p>
      </div>
    );
  }

  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  
  // Improved Y-axis scaling
  let yAxisDomain: [number, number];
  
  if (metric === 'national_rank') {
    // For rankings, show from 1 to a reasonable upper bound
    yAxisDomain = [1, Math.max(maxValue + 2, 10)];
  } else if (metric.includes('_pct') || metric.includes('index')) {
    // For percentages, ensure we show 0-100 range or focus on data range
    const range = maxValue - minValue;
    if (range < 10) {
      // If data is clustered, zoom in
      const padding = Math.max(range * 0.2, 2);
      yAxisDomain = [
        Math.max(0, minValue - padding),
        Math.min(100, maxValue + padding)
      ];
    } else {
      // For wider ranges, use full scale or padded range
      yAxisDomain = [
        Math.max(0, minValue - 5),
        Math.min(100, maxValue + 5)
      ];
    }
  } else {
    // For other metrics (like enrollment), use data-driven range
    const range = maxValue - minValue;
    const padding = range * 0.1;
    yAxisDomain = [
      Math.max(0, minValue - padding),
      maxValue + padding
    ];
  }

  // Get metric label for display
  const getMetricLabel = (metric: string) => {
    const labels: Record<string, string> = {
      'overall_score': 'Overall Score',
      'national_rank': 'National Rank',
      'enrollment': 'Enrollment',
      'ap_participation_pct': 'AP Participation %',
      'ap_pass_pct': 'AP Pass Rate %',
      'math_proficiency_pct': 'Math Proficiency %',
      'reading_proficiency_pct': 'Reading Proficiency %',
      'science_proficiency_pct': 'Science Proficiency %',
      'college_readiness_index': 'College Readiness Index',
      'graduation_rate_pct': 'Graduation Rate %'
    };
    return labels[metric] || metric;
  };

  // Custom tooltip with better formatting
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            let formattedValue = entry.value;
            
            if (metric === 'national_rank') {
              formattedValue = `#${entry.value}`;
            } else if (metric.includes('_pct') || metric.includes('index')) {
              formattedValue = `${entry.value}%`;
            } else if (metric === 'enrollment') {
              formattedValue = entry.value.toLocaleString();
            } else {
              formattedValue = Number(entry.value).toFixed(1);
            }
            
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                <span className="font-medium">{entry.dataKey}:</span> {formattedValue}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Custom Y-axis tick formatter
  const formatYAxisTick = (value: number) => {
    if (metric === 'national_rank') {
      return `#${value}`;
    } else if (metric.includes('_pct') || metric.includes('index')) {
      return `${value}%`;
    } else if (metric === 'enrollment') {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();
    } else {
      return value.toString();
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium">{getMetricLabel(metric)} Trends (2019-2025)</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {schools.length} school{schools.length !== 1 ? 's' : ''} selected
        </p>
      </div>
      
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="year" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              domain={yAxisDomain}
              reversed={metric === 'national_rank'} // Reverse for ranking (lower is better)
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatYAxisTick}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
            />
            {schools.map((school, index) => (
              <Line
                key={school.name}
                type="monotone"
                dataKey={school.name}
                stroke={SCHOOL_COLORS[index % SCHOOL_COLORS.length]}
                strokeWidth={2}
                dot={{ 
                  fill: SCHOOL_COLORS[index % SCHOOL_COLORS.length], 
                  strokeWidth: 2, 
                  r: 4,
                  stroke: '#fff'
                }}
                activeDot={{ 
                  r: 6, 
                  stroke: SCHOOL_COLORS[index % SCHOOL_COLORS.length],
                  strokeWidth: 2,
                  fill: '#fff'
                }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Chart insights */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Chart Insights</h4>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• Data span: 7 years (2019-2025)</p>
          <p>• Metric focus: {getMetricLabel(metric)}</p>
          {metric === 'national_rank' && (
            <p>• Note: Lower ranks are better (closer to #1)</p>
          )}
          <p>• Hover over data points for detailed values</p>
        </div>
      </div>
    </div>
  );
}