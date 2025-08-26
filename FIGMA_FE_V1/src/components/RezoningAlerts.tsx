import React from 'react';
import { AlertTriangle, MapPin, Calendar, FileText, ExternalLink, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

interface RezoningAlert {
  id: string;
  district: string;
  riskLevel: 'high' | 'medium' | 'low';
  type: 'boundary' | 'capacity' | 'program' | 'policy';
  title: string;
  description: string;
  timeline: string;
  meetingDate?: string;
  impactRadius: string;
  studentsAffected: number;
  citations: {
    source: string;
    page: number;
    quote: string;
    url: string;
  }[];
  actionable: boolean;
}

const mockAlerts: RezoningAlert[] = [
  {
    id: '1',
    district: 'Fairfax County Public Schools',
    riskLevel: 'high',
    type: 'boundary',
    title: 'Westfield High School Boundary Study Initiated',
    description: 'District has commissioned a boundary study affecting neighborhoods within 2.3 miles of Westfield HS. Preliminary maps suggest 1,200+ students may be reassigned.',
    timeline: 'Implementation: Fall 2026',
    meetingDate: '2025-02-15',
    impactRadius: '2.3 miles from Westfield HS',
    studentsAffected: 1200,
    citations: [
      {
        source: 'Board Meeting Minutes - January 2025',
        page: 12,
        quote: 'Motion approved to proceed with comprehensive boundary analysis for Westfield High School attendance zone...',
        url: 'https://boarddocs.fcps.edu/...'
      }
    ],
    actionable: true
  },
  {
    id: '2',
    district: 'Montgomery County Public Schools',
    riskLevel: 'medium',
    type: 'capacity',
    title: 'Richard Montgomery HS Over-Enrollment Solutions',
    description: 'School board discussing portable classrooms vs. boundary adjustments to address 127% capacity utilization.',
    timeline: 'Decision expected: March 2025',
    meetingDate: '2025-03-12',
    impactRadius: '1.8 miles from RMHS',
    studentsAffected: 340,
    citations: [
      {
        source: 'Enrollment Projections Report 2025',
        page: 23,
        quote: 'Richard Montgomery High School projected at 2,540 students against capacity of 2,000...',
        url: 'https://mcps.edu/reports/...'
      }
    ],
    actionable: true
  },
  {
    id: '3',
    district: 'Prince William County Schools',
    riskLevel: 'low',
    type: 'program',
    title: 'IB Program Consolidation Under Review',
    description: 'Budget committee reviewing proposal to consolidate International Baccalaureate programs from 3 schools to 2.',
    timeline: 'Budget vote: May 2025',
    impactRadius: 'Countywide IB students',
    studentsAffected: 450,
    citations: [
      {
        source: 'Budget Committee Agenda',
        page: 8,
        quote: 'Review cost-effectiveness of current IB program distribution across three high schools...',
        url: 'https://pwcs.edu/budget/...'
      }
    ],
    actionable: false
  }
];

export function RezoningAlerts() {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'boundary': return <MapPin className="h-4 w-4" />;
      case 'capacity': return <Users className="h-4 w-4" />;
      case 'program': return <FileText className="h-4 w-4" />;
      case 'policy': return <FileText className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium text-foreground mb-2">Active Rezoning Alerts</h2>
          <p className="text-muted-foreground">
            Early warnings based on board documents, enrollment data, and district planning
          </p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Live Monitoring
        </Badge>
      </div>

      {/* Alert Cards */}
      <div className="space-y-4">
        {mockAlerts.map((alert) => (
          <Card key={alert.id} className="border-border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getRiskColor(alert.riskLevel)}`}>
                    {getTypeIcon(alert.type)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{alert.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{alert.district}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getRiskColor(alert.riskLevel)}>
                    {alert.riskLevel.toUpperCase()} RISK
                  </Badge>
                  {alert.actionable && (
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      Action Needed
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Description */}
              <p className="text-foreground leading-relaxed">{alert.description}</p>

              {/* Key Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Timeline</p>
                    <p className="text-sm text-muted-foreground">{alert.timeline}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Impact Area</p>
                    <p className="text-sm text-muted-foreground">{alert.impactRadius}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Students Affected</p>
                    <p className="text-sm text-muted-foreground">{alert.studentsAffected.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Citations */}
              <div className="space-y-2">
                <h4 className="font-medium text-foreground">Evidence & Citations</h4>
                {alert.citations.map((citation, index) => (
                  <div key={index} className="border border-border rounded-lg p-3 bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{citation.source}</p>
                        <p className="text-xs text-muted-foreground">Page {citation.page}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-auto p-1">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                    <blockquote className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
                      "{citation.quote}"
                    </blockquote>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {alert.meetingDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Next meeting: {new Date(alert.meetingDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Generate Evidence Pack
                  </Button>
                  <Button size="sm" className="bg-primary hover:bg-primary/90">
                    Track This Alert
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Address Risk Checker */}
      <Card className="border-dashed border-2 border-border bg-secondary/20">
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-medium text-foreground mb-2">
            Check Your Address Risk
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Enter your address to get personalized alerts about boundary changes, 
            capacity issues, and policy updates that could affect your school assignment.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter your address..."
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              Check Risk
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Free risk assessment • No signup required • Results in 10 seconds
          </p>
        </CardContent>
      </Card>
    </div>
  );
}