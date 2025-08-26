import React from 'react';
import { TrendingUp, TrendingDown, Users, Award, School, BarChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface School {
  name: string;
  location: string;
  metrics: Record<string, any>;
}

interface DashboardOverviewProps {
  schools: School[];
  selectedSchools: School[];
}

export function DashboardOverview({ schools, selectedSchools }: DashboardOverviewProps) {
  // Calculate key metrics
  const totalSchools = schools.length;
  const avgScore = schools.reduce((sum, s) => sum + (s.metrics['2025']?.overall_score || 0), 0) / totalSchools;
  const avgGradRate = schools.reduce((sum, s) => sum + (s.metrics['2025']?.graduation_rate_pct || 0), 0) / totalSchools;
  const totalEnrollment = schools.reduce((sum, s) => sum + (s.metrics['2025']?.enrollment || 0), 0);

  // Calculate trends (2024 vs 2025)
  const scoreTrend = schools.reduce((sum, s) => {
    const current = s.metrics['2025']?.overall_score || 0;
    const previous = s.metrics['2024']?.overall_score || 0;
    return sum + (current - previous);
  }, 0) / totalSchools;

  const gradTrend = schools.reduce((sum, s) => {
    const current = s.metrics['2025']?.graduation_rate_pct || 0;
    const previous = s.metrics['2024']?.graduation_rate_pct || 0;
    return sum + (current - previous);
  }, 0) / totalSchools;

  const kpiCards = [
    {
      title: 'Total Schools Tracked',
      value: totalSchools.toString(),
      subtitle: 'Across all regions',
      icon: School,
      trend: null,
      color: 'blue'
    },
    {
      title: 'Average Overall Score',
      value: avgScore.toFixed(1),
      subtitle: `${scoreTrend > 0 ? '+' : ''}${scoreTrend.toFixed(1)} from last year`,
      icon: Award,
      trend: scoreTrend > 0 ? 'up' : 'down',
      color: 'green'
    },
    {
      title: 'Average Graduation Rate',
      value: `${avgGradRate.toFixed(1)}%`,
      subtitle: `${gradTrend > 0 ? '+' : ''}${gradTrend.toFixed(1)}% from last year`,
      icon: TrendingUp,
      trend: gradTrend > 0 ? 'up' : 'down',
      color: 'purple'
    },
    {
      title: 'Total Student Population',
      value: `${(totalEnrollment / 1000).toFixed(0)}K`,
      subtitle: 'Across tracked schools',
      icon: Users,
      trend: null,
      color: 'orange'
    }
  ];

  // Top performing schools
  const topSchools = schools
    .sort((a, b) => (b.metrics['2025']?.overall_score || 0) - (a.metrics['2025']?.overall_score || 0))
    .slice(0, 5);

  // Regional performance
  const regionStats = schools.reduce((acc, school) => {
    const state = school.location.split(',').pop()?.trim() || 'Unknown';
    if (!acc[state]) {
      acc[state] = { count: 0, totalScore: 0 };
    }
    acc[state].count++;
    acc[state].totalScore += school.metrics['2025']?.overall_score || 0;
    return acc;
  }, {} as Record<string, { count: number; totalScore: number }>);

  const topRegions = Object.entries(regionStats)
    .map(([state, stats]) => ({
      state,
      avgScore: stats.totalScore / stats.count,
      schoolCount: stats.count
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive analytics for U.S. high school performance trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
            Data Updated: Jan 2025
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mb-1">{kpi.value}</p>
                  <div className="flex items-center gap-1 text-sm">
                    {kpi.trend && (
                      <>
                        {kpi.trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </>
                    )}
                    <span className={`text-xs ${kpi.trend === 'up' ? 'text-green-600' : kpi.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                      {kpi.subtitle}
                    </span>
                  </div>
                </div>
                <div className={`
                  p-3 rounded-lg
                  ${kpi.color === 'blue' ? 'bg-blue-100' :
                    kpi.color === 'green' ? 'bg-green-100' :
                    kpi.color === 'purple' ? 'bg-purple-100' :
                    'bg-orange-100'
                  }
                `}>
                  <kpi.icon className={`h-6 w-6 ${
                    kpi.color === 'blue' ? 'text-blue-600' :
                    kpi.color === 'green' ? 'text-green-600' :
                    kpi.color === 'purple' ? 'text-purple-600' :
                    'text-orange-600'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performing Schools */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-600" />
              Top Performing Schools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSchools.map((school, index) => (
                <div key={school.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${index === 0 ? 'bg-yellow-100 text-yellow-800' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }
                    `}>
                      #{index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{school.name}</p>
                      <p className="text-sm text-gray-500">{school.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{school.metrics['2025']?.overall_score}</p>
                    <p className="text-sm text-gray-500">Overall Score</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Regional Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-blue-600" />
              Regional Leaders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topRegions.map((region, index) => (
                <div key={region.state} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{region.state}</p>
                      <p className="text-sm text-gray-500">{region.schoolCount} schools</p>
                    </div>
                    <span className="font-bold text-gray-900">{region.avgScore.toFixed(1)}</span>
                  </div>
                  <Progress value={region.avgScore} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selected Schools Summary */}
      {selectedSchools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Selection Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-700">{selectedSchools.length}</p>
                <p className="text-sm text-blue-600">Schools Selected</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-700">
                  {(selectedSchools.reduce((sum, s) => sum + (s.metrics['2025']?.overall_score || 0), 0) / selectedSchools.length).toFixed(1)}
                </p>
                <p className="text-sm text-green-600">Avg Score</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-700">
                  {(selectedSchools.reduce((sum, s) => sum + (s.metrics['2025']?.enrollment || 0), 0) / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-purple-600">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}