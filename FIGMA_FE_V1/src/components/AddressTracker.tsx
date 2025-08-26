import React, { useState } from 'react';
import { MapPin, Home, Shield, Bell, AlertTriangle, CheckCircle, Zap, Building, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';

interface AddressTrackerProps {
  onSubscribe: (plan: string, address: string) => void;
}

interface AddressResult {
  normalized_address: string;
  lat: number;
  lon: number;
  hs_name: string;
  district_name: string;
  boundary_verified: boolean;
  risk_level: 'low' | 'medium' | 'high';
  initial_alerts: number;
}

export function AddressTracker({ onSubscribe }: AddressTrackerProps) {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [addressResult, setAddressResult] = useState<AddressResult | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'parent' | 'realtor'>('parent');

  const handleAddressCheck = async () => {
    if (!address.trim()) return;
    
    setIsLoading(true);
    
    // Simulate API call with realistic delay
    setTimeout(() => {
      setAddressResult({
        normalized_address: '123 Maple Street, Centreville, VA 20121',
        lat: 38.8404,
        lon: -77.4291,
        hs_name: 'Westfield High School',
        district_name: 'Fairfax County Public Schools',
        boundary_verified: true,
        risk_level: 'medium',
        initial_alerts: 3
      });
      setIsLoading(false);
    }, 2000);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
          <Home className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-medium text-foreground">
          Address Tracker & Weekly Intelligence
        </h2>
        <p className="text-muted-foreground max-w-3xl mx-auto text-lg">
          Get weekly alerts about rezoning motions, ranking changes, calendar updates, 
          and district decisions that affect your address. Never miss important changes again.
        </p>
      </div>

      {/* Address Input */}
      <Card className="border-2 border-blue-200 bg-blue-50/30 max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-foreground mb-2">
                Start Your Free Risk Assessment
              </h3>
              <p className="text-sm text-muted-foreground">
                Enter your address to see assigned high school and current alert activity
              </p>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Enter your full address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="pl-10 py-3 border-2 border-blue-200 focus:border-blue-400 bg-white"
                />
              </div>
              <Button 
                onClick={handleAddressCheck}
                disabled={!address.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Checking...</span>
                  </div>
                ) : (
                  'Check Address'
                )}
              </Button>
            </div>
            
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-green-600" />
                <span>Polygon-verified boundaries</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>95%+ accuracy rate</span>
              </div>
              <div className="flex items-center gap-1">
                <Bell className="h-3 w-3 text-green-600" />
                <span>Real-time monitoring</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Result */}
      {addressResult && (
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Address Verification */}
          <Card className="border-green-200 bg-green-50/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <h3 className="text-lg font-medium text-foreground">Address Verified</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Address:</span>
                      <span className="text-muted-foreground">{addressResult.normalized_address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Assigned High School:</span>
                      <span className="text-blue-600 font-medium">{addressResult.hs_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">School District:</span>
                      <span className="text-muted-foreground">{addressResult.district_name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <Badge className={getRiskColor(addressResult.risk_level)}>
                    {addressResult.risk_level.toUpperCase()} RISK
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    {addressResult.initial_alerts} active alerts
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Initial Alerts Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Current Alert Activity
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                These are the active alerts we would monitor for your address
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-start gap-3 p-3 border border-orange-200 rounded-lg bg-orange-50/30">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">Boundary Study Initiated</h4>
                    <p className="text-sm text-muted-foreground">
                      District has commissioned boundary analysis affecting Westfield HS zone. 
                      Next board meeting: February 15, 2025
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Source: Board Meeting Minutes</span>
                      <span>•</span>
                      <span>Confidence: 92%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-blue-200 rounded-lg bg-blue-50/30">
                  <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">US News Ranking Change</h4>
                    <p className="text-sm text-muted-foreground">
                      Westfield HS dropped 12 positions in national rankings (385 → 397). 
                      State ranking unchanged at #14.
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Source: US News 2025 Rankings</span>
                      <span>•</span>
                      <span>Verified: Yes</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-green-200 rounded-lg bg-green-50/30">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">Calendar Update Available</h4>
                    <p className="text-sm text-muted-foreground">
                      New spring break dates published. Spring break moved 1 week earlier 
                      (March 24-28 → March 17-21).
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Source: District Calendar PDF</span>
                      <span>•</span>
                      <span>Effective: 2025-26 School Year</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Monitoring Plan</CardTitle>
              <p className="text-sm text-muted-foreground">
                Start receiving weekly intelligence reports for your address
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Parent Plan */}
                <Card 
                  className={`cursor-pointer transition-all ${
                    selectedPlan === 'parent' 
                      ? 'border-2 border-green-400 bg-green-50' 
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                  onClick={() => setSelectedPlan('parent')}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                            <Home className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-green-900">Parents & Families</h3>
                            <p className="text-sm text-green-700">Perfect for family planning</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-800">$5</div>
                          <div className="text-sm text-green-600">/month</div>
                        </div>
                      </div>

                      <ul className="space-y-2 text-sm text-green-800">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>1 address monitoring</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Weekly alert emails</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Rezoning early warnings</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>6-month alert history</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Calendar & ranking alerts</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                {/* Realtor Pro Plan */}
                <Card 
                  className={`cursor-pointer transition-all relative ${
                    selectedPlan === 'realtor' 
                      ? 'border-2 border-blue-400 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedPlan('realtor')}
                >
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white">
                    Most Popular
                  </Badge>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                            <Building className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-blue-900">Realtor Professional</h3>
                            <p className="text-sm text-blue-700">Complete market intelligence</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-800">$29</div>
                          <div className="text-sm text-blue-600">/month</div>
                        </div>
                      </div>

                      <ul className="space-y-2 text-sm text-blue-800">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span>Up to 20 addresses</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span>CSV export & API access</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span>Slack/Teams webhooks</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span>24-month alert history</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span>Team seats available (+$12)</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Separator className="my-6" />

              <div className="text-center space-y-4">
                <Button 
                  size="lg"
                  className={`px-8 ${
                    selectedPlan === 'parent' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                  onClick={() => onSubscribe(
                    selectedPlan === 'parent' ? 'Parent Plan - Address Tracker' : 'Realtor Pro - Address Tracker',
                    addressResult.normalized_address
                  )}
                >
                  {selectedPlan === 'realtor' && <Crown className="h-5 w-5 mr-2" />}
                  Start {selectedPlan === 'parent' ? 'Parent' : 'Professional'} Plan
                  <Bell className="h-5 w-5 ml-2" />
                </Button>

                <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>14-day free trial</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Cancel anytime</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Bell className="h-4 w-4 text-green-600" />
                    <span>Instant setup</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feature Highlights */}
      {!addressResult && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="text-center p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-medium mb-2">Polygon-Verified Boundaries</h3>
            <p className="text-sm text-muted-foreground">
              Never rely on "nearest school" again. We use official district attendance 
              polygons for accurate assignment.
            </p>
          </Card>

          <Card className="text-center p-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-medium mb-2">Weekly Intelligence Reports</h3>
            <p className="text-sm text-muted-foreground">
              Curated alerts about rezoning, rankings, calendars, and board actions 
              delivered every week.
            </p>
          </Card>

          <Card className="text-center p-6">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-medium mb-2">AI-Enhanced Detection</h3>
            <p className="text-sm text-muted-foreground">
              Local LLM analysis of board documents with deterministic rules 
              and confidence scoring.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}