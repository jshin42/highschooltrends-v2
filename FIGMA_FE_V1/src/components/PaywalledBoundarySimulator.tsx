import React from 'react';
import { Map, Home, Calculator, Users, Lock, Crown, Shield, CheckCircle, ArrowRight, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface PaywalledBoundarySimulatorProps {
  onUpgrade: (feature: string) => void;
}

export function PaywalledBoundarySimulator({ onUpgrade }: PaywalledBoundarySimulatorProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Map className="h-7 w-7 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-medium text-foreground">Boundary Impact Simulator</h2>
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 mt-1">
              <Lock className="h-3 w-3 mr-1" />
              Premium Feature
            </Badge>
          </div>
        </div>
        <p className="text-muted-foreground max-w-3xl mx-auto">
          Interactive tool showing how each proposed boundary option affects your household. 
          Analyze commute times, school quality, and property values before changes happen.
        </p>
      </div>

      {/* Preview Mockup */}
      <Card className="border-border shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white z-10"></div>
        <CardContent className="p-8 opacity-50 blur-sm">
          {/* Simulated interface */}
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4 mb-6">
              <Home className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Your Address:</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                123 Maple Street, Centreville, VA 20121
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <div className="font-medium mb-1">Option A</div>
                <div className="text-sm text-muted-foreground">25% likely</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center border-2 border-blue-200">
                <div className="font-medium mb-1 text-blue-800">Option B</div>
                <div className="text-sm text-blue-600">60% likely</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <div className="font-medium mb-1">Option C</div>
                <div className="text-sm text-muted-foreground">15% likely</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Home className="h-4 w-4 text-primary" />
                  Your Household Impact
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current School:</span>
                    <span>Westfield High</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proposed School:</span>
                    <span className="text-orange-600">Chantilly High</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Commute Change:</span>
                    <span className="text-orange-600">+6 minutes</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  School Comparison
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <div className="text-lg font-bold">85</div>
                    <div className="text-muted-foreground">Score</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">92%</div>
                    <div className="text-muted-foreground">Grad</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold">24</div>
                    <div className="text-muted-foreground">AP</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Upgrade CTA */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-xl">
        <CardContent className="p-10">
          <div className="text-center space-y-8">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
              <Calculator className="h-10 w-10 text-white" />
            </div>
            
            <div>
              <h3 className="text-3xl font-medium text-foreground mb-3">
                Plan Before the Change Happens
              </h3>
              <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                Don't get caught off guard. Use our interactive simulator to understand how 
                each boundary proposal affects your family's daily life, school quality, and home value.
              </p>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <Map className="h-10 w-10 text-blue-600 mx-auto mb-4" />
                <h4 className="font-medium mb-2">Interactive Scenarios</h4>
                <p className="text-sm text-muted-foreground">
                  Compare Option A, B, C proposals with likelihood scores and timeline predictions
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <Home className="h-10 w-10 text-green-600 mx-auto mb-4" />
                <h4 className="font-medium mb-2">Household Impact</h4>
                <p className="text-sm text-muted-foreground">
                  See exactly how changes affect your commute, school quality, and transportation options
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <TrendingUp className="h-10 w-10 text-purple-600 mx-auto mb-4" />
                <h4 className="font-medium mb-2">Market Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Understand property value implications and enrollment capacity changes
                </p>
              </div>
            </div>

            {/* Use Cases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="text-left">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Home className="h-5 w-5 text-green-600" />
                  Perfect for Parents Planning Ahead
                </h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Understand how boundary changes affect your child's education path</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Plan for transportation and after-school activity changes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Compare academic programs and extracurricular offerings</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Generate evidence for public comment at board meetings</span>
                  </li>
                </ul>
              </div>
              
              <div className="text-left">
                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  Essential for Real Estate Success
                </h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Advise clients on timing for buying or selling decisions</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Identify market opportunities before boundary changes</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Create professional reports for buyer presentations</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Demonstrate expertise in local market dynamics</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Pricing Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <Card className="border-2 border-green-300 bg-green-50 shadow-lg">
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-green-800">$5</div>
                    <div className="text-sm text-green-600">per month</div>
                  </div>
                  <h4 className="font-medium text-green-900 mb-2">Parents & Families</h4>
                  <p className="text-sm text-green-700 mb-4">
                    Complete boundary analysis + alert system
                  </p>
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => onUpgrade('Parent Plan - Boundary Simulator')}
                  >
                    Start Parent Plan
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              
              <Card className="border-2 border-blue-300 bg-blue-50 shadow-lg relative">
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white">
                  Most Popular
                </Badge>
                <CardContent className="p-6 text-center">
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-blue-800">$29</div>
                    <div className="text-sm text-blue-600">per month</div>
                  </div>
                  <h4 className="font-medium text-blue-900 mb-2">Real Estate Professional</h4>
                  <p className="text-sm text-blue-700 mb-4">
                    Advanced tools + client sharing + analytics
                  </p>
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => onUpgrade('Professional Plan - Boundary Simulator')}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Start Pro Trial
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-8 pt-8 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-green-600" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-green-600" />
                <span>25,000+ families</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}