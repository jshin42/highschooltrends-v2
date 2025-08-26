import React, { useState } from 'react';
import { Bell, Calendar, TrendingDown, TrendingUp, MapPin, FileText, ExternalLink, CheckCircle, AlertTriangle, Info, Download, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';

interface WeeklyAlert {
  id: string;
  type: 'rezoning' | 'ranking' | 'calendar' | 'board_action' | 'listing_spike';
  severity: 'low' | 'medium' | 'high';
  title: string;
  summary: string;
  details: string[];
  source: string;
  confidence: number;
  occurred_at: string;
  action_items?: string[];
  next_meeting?: string;
  source_url?: string;
}

const mockWeeklyAlerts: WeeklyAlert[] = [
  {
    id: '1',
    type: 'rezoning',
    severity: 'high',
    title: 'Boundary Study Committee Formed',
    summary: 'Westfield HS zone review committee established with public meetings scheduled',
    details: [
      'Seven-member committee appointed to review Westfield High School attendance boundaries',
      'Public input sessions scheduled for March 15, March 29, and April 12',
      'Preliminary recommendations due by May 1, 2025',
      'Committee will consider enrollment projections, transportation impacts, and equity factors'
    ],
    source: 'Board Meeting Minutes - February 11, 2025',
    confidence: 0.94,
    occurred_at: '2025-02-11',
    action_items: [
      'Mark calendar for public input sessions',
      'Review committee charter and member backgrounds', 
      'Prepare written comments for first session'
    ],
    next_meeting: 'March 15, 2025 at 7:00 PM',
    source_url: 'https://boarddocs.fcps.edu/meetings/feb2025'
  },
  {
    id: '2', 
    type: 'ranking',
    severity: 'medium',
    title: 'US News Rankings Decline',
    summary: 'Westfield HS national ranking dropped from 385 to 397 (-12 positions)',
    details: [
      'National ranking: #397 (down from #385 in 2024)',
      'Virginia state ranking: #14 (unchanged)',
      'College readiness index: 57.6 (down from 58.1)',
      'Graduation rate remains strong at 94%'
    ],
    source: 'US News Best High Schools 2025',
    confidence: 1.0,
    occurred_at: '2025-02-08',
    source_url: 'https://usnews.com/education/best-high-schools/virginia/districts/fairfax-county-public-schools/westfield-high-school-6921'
  },
  {
    id: '3',
    type: 'calendar',
    severity: 'low', 
    title: 'Spring Break Date Change',
    summary: 'Spring break moved one week earlier for 2025-26 school year',
    details: [
      'New spring break dates: March 17-21, 2025',
      'Previous dates were: March 24-28, 2025',
      'Change affects all high schools in district',
      'Updated calendar published on district website'
    ],
    source: 'District Calendar Update - February 9, 2025',
    confidence: 1.0,
    occurred_at: '2025-02-09',
    source_url: 'https://fcps.edu/calendar/2025-26'
  },
  {
    id: '4',
    type: 'board_action',
    severity: 'medium',
    title: 'Capital Improvement Plan Approved',
    summary: 'Board approved $15M technology infrastructure upgrade affecting all high schools',
    details: [
      'Motion passed 9-3 to approve CIP Amendment #4',
      '$15 million allocated for network infrastructure',
      'Westfield HS scheduled for upgrades in Phase 2 (Fall 2025)',
      'Includes fiber optic installation and WiFi 6E deployment'
    ],
    source: 'Board Meeting Minutes - February 11, 2025',
    confidence: 1.0,
    occurred_at: '2025-02-11',
    source_url: 'https://boarddocs.fcps.edu/meetings/feb2025/cip-amendment-4'
  }
];

export function WeeklyAlerts() {
  const [selectedWeek, setSelectedWeek] = useState('current');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rezoning': return <MapPin className="h-4 w-4" />;
      case 'ranking': return <TrendingDown className="h-4 w-4" />;
      case 'calendar': return <Calendar className="h-4 w-4" />;
      case 'board_action': return <FileText className="h-4 w-4" />;
      case 'listing_spike': return <TrendingUp className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'rezoning': return 'Rezoning';
      case 'ranking': return 'Rankings';
      case 'calendar': return 'Calendar';
      case 'board_action': return 'Board Action';
      case 'listing_spike': return 'Market Activity';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium text-foreground mb-2 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            Weekly School Intelligence Report
          </h2>
          <p className="text-muted-foreground">
            Curated alerts for 123 Maple Street • Westfield High School • Week of February 11, 2025
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Week Selector */}
      <Tabs value={selectedWeek} onValueChange={setSelectedWeek}>
        <TabsList className="grid w-full grid-cols-4 bg-white border border-gray-200">
          <TabsTrigger value="current" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Current Week
          </TabsTrigger>
          <TabsTrigger value="last-week" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Last Week
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Alert History
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          {/* Summary Stats */}
          <Card className="bg-gradient-to-r from-blue-50 to-white border-blue-200">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">4</div>
                  <div className="text-sm text-muted-foreground">New Alerts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">1</div>
                  <div className="text-sm text-muted-foreground">High Priority</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">94%</div>
                  <div className="text-sm text-muted-foreground">Avg Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">2</div>
                  <div className="text-sm text-muted-foreground">Action Items</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alert Details */}
          <div className="space-y-4">
            {mockWeeklyAlerts.map((alert) => (
              <Card key={alert.id} className="border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                        {getTypeIcon(alert.type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{getTypeLabel(alert.type)}</span>
                          <span>•</span>
                          <span>{new Date(alert.occurred_at).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="bg-gray-50 text-gray-700">
                        {Math.round(alert.confidence * 100)}% confident
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Summary */}
                  <p className="text-foreground font-medium">{alert.summary}</p>

                  {/* Details */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground text-sm">Key Details:</h4>
                    <ul className="space-y-1">
                      {alert.details.map((detail, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Items */}
                  {alert.action_items && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <h4 className="font-medium text-blue-900 text-sm mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Recommended Actions:
                      </h4>
                      <ul className="space-y-1">
                        {alert.action_items.map((action, index) => (
                          <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                            <span className="font-bold">{index + 1}.</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                      {alert.next_meeting && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-sm text-blue-800 font-medium">
                            📅 Next Meeting: {alert.next_meeting}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Source & Links */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Source:</span> {alert.source}
                    </div>
                    {alert.source_url && (
                      <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Source
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer Summary */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Info className="h-5 w-5 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-2">Why You Received This Report</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    This weekly report monitors district activity affecting your address at 
                    <span className="font-medium"> 123 Maple Street</span>, assigned to 
                    <span className="font-medium"> Westfield High School</span> in 
                    <span className="font-medium"> Fairfax County Public Schools</span>.
                  </p>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground">
                    <span>Next report: February 18, 2025</span>
                    <span>•</span>
                    <span>Monitoring: Boundary changes, rankings, calendar updates</span>
                    <span>•</span>
                    <a href="#" className="text-blue-600 hover:underline">Manage preferences</a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="last-week" className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Previous Week Report
              </h3>
              <p className="text-muted-foreground mb-4">
                Week of February 4-10, 2025 • 2 alerts delivered
              </p>
              <Button variant="outline">View Last Week's Report</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Alert History Archive
              </h3>
              <p className="text-muted-foreground mb-4">
                Access up to 6 months of previous reports and alerts
              </p>
              <Button variant="outline">Browse Alert Archive</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Alert Preferences
              </h3>
              <p className="text-muted-foreground mb-4">
                Configure delivery methods, frequency, and alert types
              </p>
              <Button variant="outline">Manage Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}