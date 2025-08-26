import React from 'react';
import { Home, MapPin, Calendar, FileText, Lock, Crown, Shield, CheckCircle, ArrowRight, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface PaywalledRezoningAlertsProps {
  onUpgrade: (feature: string) => void;
}

export function PaywalledRezoningAlerts({ onUpgrade }: PaywalledRezoningAlertsProps) {
  const previewAlerts = [
    {
      title: 'Westfield High School Boundary Study Initiated',
      district: 'Fairfax County Public Schools',
      timeline: 'Implementation: Fall 2026',
      studentsAffected: 1200,
      riskLevel: 'high'
    },
    {
      title: 'Richard Montgomery HS Over-Enrollment Solutions',
      district: 'Montgomery County Public Schools', 
      timeline: 'Decision expected: March 2025',
      studentsAffected: 340,
      riskLevel: 'medium'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-medium text-foreground mb-2 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Home className="h-5 w-5 text-blue-600" />
            </div>
            Rezoning Alert System
          </h2>
          <p className="text-muted-foreground">
            Get early warnings 18+ months before boundary changes affect your address
          </p>
        </div>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <Lock className="h-3 w-3 mr-1" />
          Premium Feature
        </Badge>
      </div>

      {/* Preview Cards - Blurred */}
      <div className="space-y-4 relative">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white z-10 rounded-lg"></div>
        
        {previewAlerts.map((alert, index) => (
          <Card key={index} className="border-border shadow-sm opacity-60 blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <Home className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{alert.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{alert.district}</p>
                  </div>
                </div>
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                  {alert.riskLevel.toUpperCase()} RISK
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Timeline</p>
                    <p className="text-sm text-muted-foreground">{alert.timeline}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Students Affected</p>
                    <p className="text-sm text-muted-foreground">{alert.studentsAffected.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Evidence</p>
                    <p className="text-sm text-muted-foreground">Board minutes + maps</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upgrade CTA */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
              <Bell className="h-8 w-8 text-white" />
            </div>
            
            <div>
              <h3 className="text-2xl font-medium text-foreground mb-2">
                Never Miss a Boundary Change Again
              </h3>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Get personalized alerts 18+ months before changes take effect. Perfect for parents 
                planning ahead and realtors serving clients in changing markets.
              </p>
            </div>

            {/* Value propositions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="space-y-4">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Home className="h-5 w-5 text-blue-600" />
                  For Parents & Families
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>Address-specific alerts for up to 5 schools</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>Evidence packs ready for board meetings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>Monthly policy & handbook change summaries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>Timeline alerts for public comment periods</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  For Real Estate Professionals
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>Farm area boundary risk monitoring</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>Client alert sharing & co-branded reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>Market opportunity identification</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span>Lead generation through QR codes</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-medium text-green-800">$5/month</div>
                  <div className="text-sm text-green-600 mb-3">Parents & Families</div>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onUpgrade('Parent Plan - Rezoning Alerts')}
                  >
                    Start Parent Plan
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4 text-center">
                  <div className="text-xl font-medium text-blue-800">$29/month</div>
                  <div className="text-sm text-blue-600 mb-3">Real Estate Pro</div>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => onUpgrade('Professional Plan - Rezoning Alerts')}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Start Pro Trial
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-8 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-green-600" />
                <span>25,000+ families trust us</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>95%+ accuracy rate</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4 text-green-600" />
                <span>All alerts cited</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Risk Checker - Teaser */}
      <Card className="border-dashed border-2 border-blue-200 bg-blue-50/30">
        <CardContent className="p-8 text-center">
          <Home className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-foreground mb-2">
            Check Your Address Risk Level
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            See if your address is at risk for boundary changes. Free risk assessment 
            shows likelihood and timeline for your specific location.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter your address..."
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg bg-white text-foreground placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
              <MapPin className="h-4 w-4 mr-2" />
              Check Risk
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Free risk assessment • Results in 10 seconds • No signup required
          </p>
        </CardContent>
      </Card>
    </div>
  );
}