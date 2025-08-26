import React, { useState } from 'react';
import { Map, Users, ArrowRight, Calculator, Home, School, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';

interface BoundaryOption {
  id: string;
  name: string;
  description: string;
  timeline: string;
  impacts: {
    yourAddress: {
      currentSchool: string;
      proposedSchool: string;
      distanceChange: string;
      commute: string;
    };
    enrollment: {
      current: number;
      projected: number;
      capacity: number;
      utilizationRate: string;
    };
    demographics: {
      avgScore: number;
      graduationRate: number;
      apOfferings: number;
    };
    transportation: {
      busEligible: boolean;
      walkZone: boolean;
      newRoutes: string[];
    };
  };
  pros: string[];
  cons: string[];
  likelihood: number;
}

const mockScenarios: BoundaryOption[] = [
  {
    id: 'option-a',
    name: 'Option A: Minimal Changes',
    description: 'Adjust boundaries minimally, focus on portable classrooms for overcrowding',
    timeline: 'Implementation: Fall 2026',
    impacts: {
      yourAddress: {
        currentSchool: 'Westfield High School',
        proposedSchool: 'Westfield High School',
        distanceChange: 'No change',
        commute: '12 minutes (same)'
      },
      enrollment: {
        current: 2540,
        projected: 2600,
        capacity: 2000,
        utilizationRate: '130%'
      },
      demographics: {
        avgScore: 87,
        graduationRate: 94,
        apOfferings: 28
      },
      transportation: {
        busEligible: true,
        walkZone: false,
        newRoutes: []
      }
    },
    pros: [
      'No disruption to current students',
      'Maintains school community ties',
      'Lower implementation costs'
    ],
    cons: [
      'Overcrowding remains unresolved',
      'Temporary portable classrooms',
      'Strain on facilities and resources'
    ],
    likelihood: 25
  },
  {
    id: 'option-b',
    name: 'Option B: Moderate Redistricting',
    description: 'Reassign 600 students to balance enrollment across three schools',
    timeline: 'Implementation: Fall 2026',
    impacts: {
      yourAddress: {
        currentSchool: 'Westfield High School',
        proposedSchool: 'Chantilly High School',
        distanceChange: '+2.4 miles',
        commute: '18 minutes (+6 min)'
      },
      enrollment: {
        current: 2540,
        projected: 1950,
        capacity: 2200,
        utilizationRate: '89%'
      },
      demographics: {
        avgScore: 85,
        graduationRate: 92,
        apOfferings: 24
      },
      transportation: {
        busEligible: true,
        walkZone: false,
        newRoutes: ['Route 47B', 'Route 52']
      }
    },
    pros: [
      'Balanced enrollment across schools',
      'Better resource allocation',
      'Maintains quality programs'
    ],
    cons: [
      'Disrupts established communities',
      'Longer commute for some families',
      'Fewer AP course offerings'
    ],
    likelihood: 60
  },
  {
    id: 'option-c',
    name: 'Option C: Major Realignment',
    description: 'Comprehensive boundary redraw affecting 1,200+ students across five schools',
    timeline: 'Implementation: Fall 2027 (phased)',
    impacts: {
      yourAddress: {
        currentSchool: 'Westfield High School',
        proposedSchool: 'Centreville High School',
        distanceChange: '+4.1 miles',
        commute: '25 minutes (+13 min)'
      },
      enrollment: {
        current: 2540,
        projected: 1800,
        capacity: 2000,
        utilizationRate: '90%'
      },
      demographics: {
        avgScore: 82,
        graduationRate: 89,
        apOfferings: 19
      },
      transportation: {
        busEligible: true,
        walkZone: false,
        newRoutes: ['Route 73', 'Route 84A']
      }
    },
    pros: [
      'Long-term enrollment stability',
      'Optimal facility utilization',
      'Equity in resource distribution'
    ],
    cons: [
      'Major community disruption',
      'Significantly longer commutes',
      'Reduced program offerings'
    ],
    likelihood: 15
  }
];

export function BoundarySimulator() {
  const [selectedOption, setSelectedOption] = useState<string>('option-b');
  const currentOption = mockScenarios.find(option => option.id === selectedOption)!;

  const getImpactColor = (change: string) => {
    if (change.includes('No change') || change.includes('same')) return 'text-green-600';
    if (change.includes('+') && (change.includes('2.') || change.includes('1.'))) return 'text-orange-600';
    if (change.includes('+') && change.includes('4.')) return 'text-red-600';
    return 'text-foreground';
  };

  const getLikelihoodColor = (likelihood: number) => {
    if (likelihood >= 50) return 'bg-green-100 text-green-800 border-green-200';
    if (likelihood >= 30) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-medium text-foreground">Boundary Impact Simulator</h2>
        <p className="text-muted-foreground max-w-3xl mx-auto">
          See how each proposed boundary option would affect your household. Analysis based on 
          official district proposals and historical enrollment data.
        </p>
        
        {/* Address Input */}
        <Card className="bg-secondary/30 border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-4">
              <Home className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Your Address:</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                123 Maple Street, Centreville, VA 20121
              </Badge>
              <Button variant="ghost" size="sm" className="text-primary">
                Change Address
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Option Selector */}
      <Tabs value={selectedOption} onValueChange={setSelectedOption}>
        <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
          {mockScenarios.map((option) => (
            <TabsTrigger 
              key={option.id} 
              value={option.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative"
            >
              <div className="text-center">
                <div className="font-medium">{option.name.split(':')[0]}</div>
                <div className="text-xs opacity-75">{option.likelihood}% likely</div>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>

        {mockScenarios.map((option) => (
          <TabsContent key={option.id} value={option.id} className="space-y-6">
            {/* Option Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{option.name}</CardTitle>
                  <Badge variant="outline" className={getLikelihoodColor(option.likelihood)}>
                    {option.likelihood}% Likelihood
                  </Badge>
                </div>
                <p className="text-muted-foreground">{option.description}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {option.timeline}
                </p>
              </CardHeader>
            </Card>

            {/* Impact Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Household Impact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    Your Household Impact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Current School:</span>
                      <span className="text-sm text-muted-foreground">{option.impacts.yourAddress.currentSchool}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Proposed School:</span>
                      <span className={`text-sm font-medium ${getImpactColor(option.impacts.yourAddress.proposedSchool)}`}>
                        {option.impacts.yourAddress.proposedSchool}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Distance Change:</span>
                      <span className={`text-sm font-medium ${getImpactColor(option.impacts.yourAddress.distanceChange)}`}>
                        {option.impacts.yourAddress.distanceChange}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Commute Time:</span>
                      <span className={`text-sm font-medium ${getImpactColor(option.impacts.yourAddress.commute)}`}>
                        {option.impacts.yourAddress.commute}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Transportation</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${option.impacts.transportation.busEligible ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm">Bus eligible: {option.impacts.transportation.busEligible ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${option.impacts.transportation.walkZone ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className="text-sm">Walk zone: {option.impacts.transportation.walkZone ? 'Yes' : 'No'}</span>
                      </div>
                      {option.impacts.transportation.newRoutes.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          New routes: {option.impacts.transportation.newRoutes.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* School Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <School className="h-5 w-5 text-primary" />
                    School Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-foreground">{option.impacts.demographics.avgScore}</div>
                      <div className="text-xs text-muted-foreground">Avg Score</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{option.impacts.demographics.graduationRate}%</div>
                      <div className="text-xs text-muted-foreground">Grad Rate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{option.impacts.demographics.apOfferings}</div>
                      <div className="text-xs text-muted-foreground">AP Courses</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Enrollment Impact</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current Enrollment:</span>
                        <span>{option.impacts.enrollment.current.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Projected Enrollment:</span>
                        <span className={getImpactColor(option.impacts.enrollment.projected.toString())}>
                          {option.impacts.enrollment.projected.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>School Capacity:</span>
                        <span>{option.impacts.enrollment.capacity.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Utilization Rate:</span>
                        <span className={option.impacts.enrollment.utilizationRate.includes('130') ? 'text-red-600' : 
                                        option.impacts.enrollment.utilizationRate.includes('89') || 
                                        option.impacts.enrollment.utilizationRate.includes('90') ? 'text-green-600' : 'text-foreground'}>
                          {option.impacts.enrollment.utilizationRate}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Pros and Cons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-green-200 bg-green-50/30">
                <CardHeader>
                  <CardTitle className="text-green-800">Advantages</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {option.pros.map((pro, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-green-800">{pro}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/30">
                <CardHeader>
                  <CardTitle className="text-red-800">Challenges</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {option.cons.map((con, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-red-800">{con}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Action Items */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div className="space-y-4 flex-1">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">What You Can Do</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li>• Attend the public hearing on {new Date(Date.now() + 30*24*60*60*1000).toLocaleDateString()}</li>
                        <li>• Submit written comments to the school board by {new Date(Date.now() + 45*24*60*60*1000).toLocaleDateString()}</li>
                        <li>• Join or contact your neighborhood association</li>
                        <li>• Review detailed maps and enrollment projections</li>
                      </ul>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button size="sm" className="bg-primary hover:bg-primary/90">
                        Generate Evidence Pack
                      </Button>
                      <Button variant="outline" size="sm">
                        Track This Proposal
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}