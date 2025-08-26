import React, { useState, useEffect } from 'react';
import { ProfessionalHeader } from './components/ProfessionalHeader';
import { HeroSection } from './components/HeroSection';
import { FeatureShowcase } from './components/FeatureShowcase';
import { PaywalledRezoningAlerts } from './components/PaywalledRezoningAlerts';
import { PaywalledBoundarySimulator } from './components/PaywalledBoundarySimulator';
import { AddressTracker } from './components/AddressTracker';
import { WeeklyAlerts } from './components/WeeklyAlerts';
import { SchoolSearch } from './components/SchoolSearch';
import { MetricPicker } from './components/MetricPicker';
import { TrendsChart } from './components/TrendsChart';
import { MetricsComparison } from './components/MetricsComparison';
import { RegionalDashboard } from './components/RegionalDashboard';
import { SnapshotReport } from './components/SnapshotReport';
import { PaywallModal } from './components/PaywallModal';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { 
  Home, 
  MapPin, 
  FileText, 
  Zap,
  Building,
  Users,
  TrendingUp,
  ArrowRight,
  Star,
  Crown,
  Calculator,
  Bell,
  Search,
  Shield,
  Lock,
  CheckCircle,
  GraduationCap
} from 'lucide-react';
import { schoolsData } from './data/schools';

interface School {
  name: string;
  location: string;
  metrics: Record<string, any>;
}

export default function App() {
  const [schools] = useState<School[]>(schoolsData.schools);
  const [selectedSchools, setSelectedSchools] = useState<School[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('overall_score');
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState('');
  const [activeSection, setActiveSection] = useState<'hero' | 'analytics'>('hero');
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  // Initialize with first three schools for demo
  useEffect(() => {
    if (schools.length >= 3) {
      setSelectedSchools([schools[0], schools[1], schools[2]]);
    }
  }, [schools]);

  const handleProFeatureClick = (featureName: string) => {
    setPaywallFeature(featureName);
    setShowPaywall(true);
  };

  const handleAddressSubscription = (plan: string, address: string) => {
    // Simulate subscription flow
    console.log('Subscribing to:', plan, 'for address:', address);
    setPaywallFeature(plan);
    setShowPaywall(true);
  };

  const handleGetStarted = () => {
    setActiveSection('analytics');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <ProfessionalHeader />

      {/* Hero Section */}
      {activeSection === 'hero' && (
        <>
          <HeroSection />
          <FeatureShowcase />
          
          {/* Quick start section */}
          <section className="py-16 bg-white border-t border-gray-200">
            <div className="container mx-auto px-4 text-center">
              <div className="max-w-3xl mx-auto">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-3xl font-medium text-foreground mb-4">
                  Start Exploring School Intelligence
                </h3>
                <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                  Compare high schools, analyze trends, and make informed decisions with comprehensive 
                  school performance data. Free access to rankings, metrics, and market insights.
                </p>
                
                {/* Trust indicators */}
                <div className="flex items-center justify-center gap-8 mb-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>95%+ accuracy rate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span>Live 2025 data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span>7-year trends included</span>
                  </div>
                </div>
                
                <Button 
                  size="lg" 
                  onClick={handleGetStarted}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Search Schools Now
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                
                <p className="text-sm text-muted-foreground mt-4">
                  Free school search • No signup required • Compare up to 3 schools
                </p>
              </div>
            </div>
          </section>

          {/* Address Risk Feature Highlight */}
          <section className="py-16 bg-gray-50 border-t border-gray-200">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="h-6 w-6 text-orange-600" />
                  </div>
                  <h3 className="text-2xl font-medium text-foreground mb-4">
                    Need Address-Specific Monitoring?
                  </h3>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Get weekly alerts about boundary changes, district decisions, and ranking updates 
                    that specifically affect your home address.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="border-green-200 bg-green-50/30">
                    <CardContent className="p-6 text-center">
                      <Home className="h-10 w-10 text-green-600 mx-auto mb-4" />
                      <h4 className="font-medium text-green-900 mb-2">Parents & Families</h4>
                      <p className="text-sm text-green-700 mb-4">
                        Monitor 1 address for rezoning alerts, ranking changes, and calendar updates
                      </p>
                      <div className="text-2xl font-bold text-green-800 mb-4">$5/month</div>
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleProFeatureClick('Parent Address Monitoring')}
                      >
                        Start Monitoring
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50/30">
                    <CardContent className="p-6 text-center">
                      <Building className="h-10 w-10 text-blue-600 mx-auto mb-4" />
                      <h4 className="font-medium text-blue-900 mb-2">Real Estate Professionals</h4>
                      <p className="text-sm text-blue-700 mb-4">
                        Track up to 20 addresses with professional reports and client sharing
                      </p>
                      <div className="text-2xl font-bold text-blue-800 mb-4">$29/month</div>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => handleProFeatureClick('Professional Address Monitoring')}
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Start Pro Trial
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Main Analytics Interface */}
      {activeSection === 'analytics' && (
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button 
              onClick={() => setActiveSection('hero')}
              className="hover:text-blue-600 transition-colors flex items-center gap-1"
            >
              <Home className="h-3 w-3" />
              Home
            </button>
            <span>/</span>
            <span className="text-foreground">School Intelligence Dashboard</span>
          </div>

          {/* Tab Navigation */}
          <Tabs defaultValue="search" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-8 bg-white border border-gray-200 shadow-sm">
              <TabsTrigger 
                value="search" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <Search className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">School Search</span>
                <span className="sm:hidden">Search</span>
              </TabsTrigger>
              <TabsTrigger 
                value="tracker" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <MapPin className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Address Risk</span>
                <span className="sm:hidden">Address</span>
              </TabsTrigger>
              <TabsTrigger 
                value="alerts" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white relative"
              >
                <Bell className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Rezoning Alerts</span>
                <span className="sm:hidden">Alerts</span>
                <Lock className="h-3 w-3 text-orange-500 ml-1" />
              </TabsTrigger>
              <TabsTrigger 
                value="simulator" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white relative"
              >
                <Calculator className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Boundary Simulator</span>
                <span className="sm:hidden">Simulator</span>
                <Lock className="h-3 w-3 text-orange-500 ml-1" />
              </TabsTrigger>
              <TabsTrigger 
                value="market" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Market Analysis</span>
                <span className="sm:hidden">Market</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white relative"
              >
                <FileText className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Professional Reports</span>
                <span className="sm:hidden">Reports</span>
                <Crown className="h-3 w-3 text-orange-500 ml-1" />
              </TabsTrigger>
            </TabsList>

            {/* Free School Search Tab - Primary Tab */}
            <TabsContent value="search" className="space-y-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <Search className="h-5 w-5 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-medium text-foreground">School Search & Analysis</h2>
                  <Badge className="bg-green-100 text-green-700 border-green-200">Free</Badge>
                </div>
                <p className="text-muted-foreground">
                  Compare up to 3 schools, analyze trends, and explore market data. Free access to comprehensive school intelligence.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Search Controls */}
                <div className="xl:col-span-1 space-y-4">
                  <Card className="border-gray-200 shadow-sm bg-white">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                        Select Schools
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Choose up to 3 schools to compare
                      </p>
                    </CardHeader>
                    <CardContent>
                      <SchoolSearch
                        schools={schools}
                        selectedSchools={selectedSchools}
                        onSchoolsChange={setSelectedSchools}
                        maxSelections={3}
                      />
                    </CardContent>
                  </Card>

                  <Card className="border-gray-200 shadow-sm bg-white">
                    <CardHeader className="pb-4">
                      <CardTitle>Analysis Focus</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <MetricPicker
                        selectedMetric={selectedMetric}
                        onMetricChange={setSelectedMetric}
                      />
                    </CardContent>
                  </Card>

                  {/* Selection Summary */}
                  {selectedSchools.length > 0 && (
                    <Card className="border-blue-200 bg-blue-50/30">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-blue-900 mb-2">
                          Selected Schools ({selectedSchools.length}/3)
                        </h4>
                        <div className="space-y-2">
                          {selectedSchools.map((school, index) => (
                            <div key={index} className="text-sm text-blue-800 flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                index === 0 ? 'bg-blue-500' : 
                                index === 1 ? 'bg-green-500' : 'bg-orange-500'
                              }`}></div>
                              <span className="truncate">{school.name}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* User type indicators */}
                  <div className="space-y-2">
                    <Badge variant="outline" className="w-full justify-center bg-blue-50 text-blue-700 border-blue-200">
                      <Building className="h-3 w-3 mr-1" />
                      Perfect for Realtors
                    </Badge>
                    <Badge variant="outline" className="w-full justify-center bg-green-50 text-green-700 border-green-200">
                      <Home className="h-3 w-3 mr-1" />
                      Trusted by Parents
                    </Badge>
                  </div>
                </div>

                {/* Main Chart */}
                <div className="xl:col-span-3">
                  <Card className="border-gray-200 shadow-sm bg-white">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-blue-600" />
                          Performance Trends Analysis
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                            Live Data (2019-2025)
                          </Badge>
                          {selectedSchools.length > 0 && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {selectedSchools.length} school{selectedSchools.length > 1 ? 's' : ''} selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {selectedSchools.length > 0 ? (
                        <TrendsChart schools={selectedSchools} metric={selectedMetric} />
                      ) : (
                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                          <div className="text-center">
                            <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">No schools selected</p>
                            <p className="text-sm">Choose schools from the sidebar to view trends</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Enhanced Metrics Comparison */}
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Comprehensive School Comparison
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Side-by-side analysis with 7-year trends and performance insights
                    {selectedSchools.length > 0 && ` • Comparing ${selectedSchools.length} school${selectedSchools.length > 1 ? 's' : ''}`}
                  </p>
                </CardHeader>
                <CardContent>
                  {selectedSchools.length > 0 ? (
                    <MetricsComparison schools={selectedSchools} />
                  ) : (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      <div className="text-center">
                        <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">Select schools to see detailed comparison</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              {selectedSchools.length > 0 && (
                <Card className="border-green-200 bg-green-50/30">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-green-900 mb-1">
                          Ready for deeper insights?
                        </h4>
                        <p className="text-sm text-green-700">
                          Get professional reports, boundary risk analysis, and weekly alerts for these schools
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-green-300 text-green-700 hover:bg-green-100"
                          onClick={() => handleProFeatureClick('Professional School Analysis')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Report
                        </Button>
                        <Button 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleProFeatureClick('Address Tracking for Schools')}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Monitor Address
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Address Risk/Tracker Tab */}
            <TabsContent value="tracker" className="space-y-6">
              {hasActiveSubscription ? (
                <WeeklyAlerts />
              ) : (
                <AddressTracker onSubscribe={handleAddressSubscription} />
              )}
            </TabsContent>

            {/* Paywalled Rezoning Alerts Tab */}
            <TabsContent value="alerts" className="space-y-6">
              <PaywalledRezoningAlerts onUpgrade={handleProFeatureClick} />
            </TabsContent>

            {/* Paywalled Boundary Simulator Tab */}
            <TabsContent value="simulator" className="space-y-6">
              <PaywalledBoundarySimulator onUpgrade={handleProFeatureClick} />
            </TabsContent>

            {/* Market Analysis Tab */}
            <TabsContent value="market" className="space-y-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-medium text-foreground">Market Analysis</h2>
                  <Badge className="bg-green-100 text-green-700 border-green-200">Free</Badge>
                </div>
                <p className="text-muted-foreground">
                  Regional insights and market trends for educational planning and real estate decisions.
                </p>
              </div>
              <RegionalDashboard schools={schools} />
            </TabsContent>

            {/* Professional Reports Tab (Enhanced) */}
            <TabsContent value="reports" className="space-y-6">
              <Card className="border-gray-200 shadow-sm bg-white">
                <CardContent className="p-10">
                  <div className="text-center space-y-8">
                    <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto">
                      <FileText className="h-10 w-10 text-white" />
                    </div>
                    
                    <div>
                      <h3 className="text-3xl font-medium text-foreground mb-3">
                        Professional School Reports & Intelligence
                      </h3>
                      <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
                        Complete school intelligence suite with weekly alerts, evidence packs for board meetings, 
                        and professional listing snapshots. Perfect for realtors and informed parents.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                      <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
                        <Bell className="h-10 w-10 text-blue-500 mx-auto mb-4" />
                        <h4 className="font-medium mb-2">Weekly Intelligence</h4>
                        <p className="text-sm text-muted-foreground">
                          Address-specific weekly reports with rezoning alerts, ranking changes, 
                          and district activity monitoring
                        </p>
                      </div>

                      <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
                        <Star className="h-10 w-10 text-orange-500 mx-auto mb-4" />
                        <h4 className="font-medium mb-2">Listing Snapshots</h4>
                        <p className="text-sm text-muted-foreground">
                          Instant PDF reports for real estate listings with school performance, 
                          rezoning risk, and market insights (&lt;60s generation)
                        </p>
                      </div>
                      
                      <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
                        <FileText className="h-10 w-10 text-green-500 mx-auto mb-4" />
                        <h4 className="font-medium mb-2">Evidence Packs</h4>
                        <p className="text-sm text-muted-foreground">
                          One-page summaries with exact quotes, page references, and maps 
                          ready for public comment at board meetings
                        </p>
                      </div>
                    </div>

                    {/* Enhanced Pricing tiers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                      <Card className="border-2 border-green-300 bg-green-50 shadow-lg">
                        <CardContent className="p-8">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Home className="h-6 w-6 text-white" />
                            </div>
                            <h4 className="font-medium text-green-900 mb-2">Parents & Families</h4>
                            <div className="text-3xl font-bold text-green-800 mb-1">$5/month</div>
                            <p className="text-sm text-green-700 mb-6">Complete family protection</p>
                            <ul className="text-sm text-green-800 space-y-2 mb-6 text-left">
                              <li>• 1 address weekly monitoring</li>
                              <li>• Rezoning early warning system</li>
                              <li>• Weekly intelligence reports</li>
                              <li>• Evidence packs for board meetings</li>
                              <li>• 6-month alert history</li>
                            </ul>
                            <Button 
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleProFeatureClick('Parent Plan - Weekly Intelligence')}
                            >
                              Start Parent Plan
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-2 border-blue-300 bg-blue-50 shadow-lg relative">
                        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white">
                          Most Popular
                        </Badge>
                        <CardContent className="p-8">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Building className="h-6 w-6 text-white" />
                            </div>
                            <h4 className="font-medium text-blue-900 mb-2">Real Estate Professionals</h4>
                            <div className="text-3xl font-bold text-blue-800 mb-1">$29/month</div>
                            <p className="text-sm text-blue-700 mb-6">Complete market intelligence</p>
                            <ul className="text-sm text-blue-800 space-y-2 mb-6 text-left">
                              <li>• Up to 20 addresses monitoring</li>
                              <li>• CSV export & API access</li>
                              <li>• Slack/Teams webhook integration</li>
                              <li>• Professional listing snapshots</li>
                              <li>• 24-month alert history</li>
                              <li>• Team seats available (+$12)</li>
                            </ul>
                            <Button 
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleProFeatureClick('Professional Plan - Complete Intelligence')}
                            >
                              <Crown className="h-4 w-4 mr-2" />
                              Start Pro Trial
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="flex items-center justify-center gap-8 pt-8 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4 text-green-600" />
                        <span>14-day free trial</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Instant setup</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Bell className="h-4 w-4 text-green-600" />
                        <span>Cancel anytime</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      )}

      {/* Enhanced Paywall Modal */}
      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)}
        feature={paywallFeature}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company info */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Home className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-medium text-foreground">HighSchoolTrends.org</span>
              </div>
              <p className="text-muted-foreground mb-4 max-w-md">
                Professional school intelligence platform providing comprehensive school analysis, 
                address monitoring, and district decision tracking. Trusted by 25,000+ families and realtors nationwide.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>© 2025 HighSchoolTrends.org</span>
                <span>•</span>
                <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
                <span>•</span>
                <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
              </div>
            </div>
            
            {/* Solutions */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Solutions</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-blue-600 transition-colors">School Search</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Address Risk Monitoring</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Weekly Intelligence</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Professional Reports</a></li>
              </ul>
            </div>
            
            {/* Support */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-blue-600 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Contact Sales</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">API Documentation</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">(855) HST-REND</a></li>
              </ul>
            </div>
          </div>
          
          {/* Data sources disclaimer */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-xs text-muted-foreground text-center">
              Data sources: US News Rankings, NCES, State Education Departments, District websites. 
              School search powered by comprehensive 2025 data with 7-year historical trends included.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}