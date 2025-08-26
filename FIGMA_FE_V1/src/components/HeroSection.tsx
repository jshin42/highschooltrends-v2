import React from 'react';
import { AlertTriangle, FileText, Building, CheckCircle, ArrowRight, MapPin, Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

export function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-secondary/30 to-background py-12 lg:py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left column - Content */}
          <div className="space-y-6">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Rezoning Alert System Active
              </Badge>
              <h1 className="text-3xl lg:text-4xl xl:text-5xl font-medium text-foreground leading-tight">
                Know Before You're 
                <span className="text-primary"> Rezoned</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Get early warnings about school boundary changes, policy updates, and district decisions 
                that affect your address. Evidence-backed alerts with citations from official board documents.
              </p>
            </div>

            {/* Core value props */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="h-3 w-3 text-green-600" />
                </div>
                <span className="text-foreground">Address-specific alerts up to 18 months before changes take effect</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="h-3 w-3 text-blue-600" />
                </div>
                <span className="text-foreground">Evidence packs with exact quotes and page references for board meetings</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-3 w-3 text-purple-600" />
                </div>
                <span className="text-foreground">Boundary simulators showing Option A, B, C impacts on your household</span>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <MapPin className="h-5 w-5 mr-2" />
                Check My Address Risk
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="border-border hover:bg-accent">
                <Building className="h-5 w-5 mr-2" />
                Realtor Solutions
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>50,000+ schools tracked</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>95%+ alerts with citations</span>
              </div>
            </div>
          </div>

          {/* Right column - Feature cards */}
          <div className="grid grid-cols-1 gap-4">
            {/* Parents Card */}
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-green-900 mb-1">For Parents & Families</h3>
                    <p className="text-sm text-green-700">$5/month • Cancel anytime</p>
                  </div>
                  <Badge className="bg-green-600 text-white">Most Popular</Badge>
                </div>
                <ul className="space-y-2 text-sm text-green-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                    <span>Rezoning alerts for up to 5 schools</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                    <span>Monthly policy & handbook changes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                    <span>Evidence packs for board meetings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                    <span>School fit recommendations</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Realtors Card */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-blue-900 mb-1">For Real Estate Professionals</h3>
                    <p className="text-sm text-blue-700">$29/month • Team seats $12 each</p>
                  </div>
                  <Badge variant="outline" className="border-blue-300 text-blue-700">Professional</Badge>
                </div>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span>Listing → School snapshot PDFs (&lt;60s)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span>Buyer tour planner with talking points</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span>Farm area heatmaps & rezoning risk</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    <span>QR code lead capture system</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Data trust indicator */}
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Live Data Sources</span>
              </div>
              <p className="text-xs text-muted-foreground">
                BoardDocs • Legistar • District websites • NCES • ArcGIS boundaries
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}