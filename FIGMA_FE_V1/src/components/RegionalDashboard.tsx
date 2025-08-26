import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Award, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';

interface School {
  name: string;
  location: string;
  metrics: Record<string, any>;
}

interface RegionalDashboardProps {
  schools: School[];
}

interface RegionStats {
  name: string;
  count: number;
  avgScore: number;
  avgGradRate: number;
  avgAPPass: number;
  totalEnrollment: number;
  topSchool: string;
  improvement: number;
}

export function RegionalDashboard({ schools }: RegionalDashboardProps) {
  const regionalStats = useMemo(() => {
    // Group schools by state
    const regionGroups: Record<string, School[]> = {};
    
    schools.forEach(school => {
      const state = school.location.split(',').pop()?.trim() || 'Unknown';
      if (!regionGroups[state]) {
        regionGroups[state] = [];
      }
      regionGroups[state].push(school);
    });

    // Calculate stats for each region
    const stats: RegionStats[] = Object.entries(regionGroups).map(([state, regionSchools]) => {
      const currentYear = '2025';
      const pastYear = '2019';
      
      const schoolsWithData = regionSchools.filter(s => s.metrics[currentYear]);
      
      const avgScore = schoolsWithData.reduce((sum, s) => 
        sum + (s.metrics[currentYear]?.overall_score || 0), 0) / schoolsWithData.length;
      
      const avgGradRate = schoolsWithData.reduce((sum, s) => 
        sum + (s.metrics[currentYear]?.graduation_rate_pct || 0), 0) / schoolsWithData.length;
      
      const avgAPPass = schoolsWithData.reduce((sum, s) => 
        sum + (s.metrics[currentYear]?.ap_pass_pct || 0), 0) / schoolsWithData.length;
      
      const totalEnrollment = schoolsWithData.reduce((sum, s) => 
        sum + (s.metrics[currentYear]?.enrollment || 0), 0);
      
      // Find top school by overall score
      const topSchool = schoolsWithData.reduce((top, school) => 
        (school.metrics[currentYear]?.overall_score || 0) > (top.metrics[currentYear]?.overall_score || 0) 
          ? school : top, schoolsWithData[0]);
      
      // Calculate overall improvement (average score change)
      const pastAvgScore = schoolsWithData.reduce((sum, s) => 
        sum + (s.metrics[pastYear]?.overall_score || 0), 0) / schoolsWithData.length;
      const improvement = avgScore - pastAvgScore;
      
      return {
        name: state,
        count: schoolsWithData.length,
        avgScore: avgScore,
        avgGradRate: avgGradRate,
        avgAPPass: avgAPPass,
        totalEnrollment: totalEnrollment,
        topSchool: topSchool?.name || '',
        improvement: improvement
      };
    });

    return stats.sort((a, b) => b.avgScore - a.avgScore);
  }, [schools]);

  const nationalStats = useMemo(() => {
    const currentYear = '2025';
    const schoolsWithData = schools.filter(s => s.metrics[currentYear]);
    
    return {
      totalSchools: schoolsWithData.length,
      avgScore: schoolsWithData.reduce((sum, s) => sum + (s.metrics[currentYear]?.overall_score || 0), 0) / schoolsWithData.length,
      totalEnrollment: schoolsWithData.reduce((sum, s) => sum + (s.metrics[currentYear]?.enrollment || 0), 0),
      avgGradRate: schoolsWithData.reduce((sum, s) => sum + (s.metrics[currentYear]?.graduation_rate_pct || 0), 0) / schoolsWithData.length
    };
  }, [schools]);

  if (schools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Regional Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No schools selected for regional analysis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* National Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            National Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{nationalStats.totalSchools}</div>
              <div className="text-sm text-muted-foreground">Top Schools Tracked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{nationalStats.avgScore.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Avg Overall Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{(nationalStats.totalEnrollment / 1000).toFixed(0)}k</div>
              <div className="text-sm text-muted-foreground">Total Students</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{nationalStats.avgGradRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Graduation Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Performance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Performance metrics by state for tracked schools
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {regionalStats.map((region, index) => (
              <div key={region.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono">
                      #{index + 1}
                    </Badge>
                    <h3 className="font-medium">{region.name}</h3>
                    <Badge variant="secondary">
                      {region.count} school{region.count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {region.improvement > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={region.improvement > 0 ? 'text-green-500' : 'text-red-500'}>
                      {region.improvement > 0 ? '+' : ''}{region.improvement.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Overall Score</div>
                    <div className="font-medium">{region.avgScore.toFixed(1)}</div>
                    <Progress value={region.avgScore} className="h-2 mt-1" />
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Graduation Rate</div>
                    <div className="font-medium">{region.avgGradRate.toFixed(1)}%</div>
                    <Progress value={region.avgGradRate} className="h-2 mt-1" />
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">AP Pass Rate</div>
                    <div className="font-medium">{region.avgAPPass.toFixed(1)}%</div>
                    <Progress value={region.avgAPPass} className="h-2 mt-1" />
                  </div>
                  
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Total Enrollment</div>
                    <div className="font-medium flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {(region.totalEnrollment / 1000).toFixed(1)}k
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Top School: <span className="font-medium text-foreground">{region.topSchool}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}