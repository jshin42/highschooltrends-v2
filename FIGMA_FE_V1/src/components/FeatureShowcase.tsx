import React from 'react';
import { BarChart3, Map, FileText, Zap, Users, Building, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Feature {
  icon: React.ElementType;
  title: string;
  description: string;
  userType: 'realtor' | 'parent' | 'both';
  isPro?: boolean;
}

const features: Feature[] = [
  {
    icon: BarChart3,
    title: 'School Performance Analytics',
    description: 'Comprehensive performance metrics, rankings, and 7-year trend analysis for every tracked school.',
    userType: 'both'
  },
  {
    icon: Map,
    title: 'Market Area Insights',
    description: 'Geographic analysis of school quality, enrollment trends, and neighborhood education patterns.',
    userType: 'realtor'
  },
  {
    icon: FileText,
    title: 'Professional Reports',
    description: 'Generate detailed school reports for clients with key metrics, trends, and comparable analysis.',
    userType: 'realtor',
    isPro: true
  },
  {
    icon: Users,
    title: 'Family Matching',
    description: 'Find schools that match your family\'s specific needs, preferences, and educational priorities.',
    userType: 'parent'
  },
  {
    icon: Building,
    title: 'Property Integration',
    description: 'Connect school data with property listings to provide comprehensive market insights to clients.',
    userType: 'realtor',
    isPro: true
  },
  {
    icon: Zap,
    title: 'AI-Powered Insights',
    description: 'Get instant answers to complex questions about school performance, trends, and comparisons.',
    userType: 'both',
    isPro: true
  }
];

export function FeatureShowcase() {
  return (
    <section className="py-16 lg:py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-medium text-foreground mb-4">
            Everything You Need to Make Informed Decisions
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Whether you're a real estate professional serving clients or a parent choosing the best 
            education for your children, we provide the data and insights you need.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    feature.userType === 'realtor' ? 'bg-blue-100' :
                    feature.userType === 'parent' ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    <feature.icon className={`h-6 w-6 ${
                      feature.userType === 'realtor' ? 'text-blue-600' :
                      feature.userType === 'parent' ? 'text-green-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <div className="flex gap-2">
                    {feature.isPro && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                        Pro
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-xs ${
                      feature.userType === 'realtor' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      feature.userType === 'parent' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {feature.userType === 'realtor' ? 'Realtors' :
                       feature.userType === 'parent' ? 'Parents' : 'All Users'}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA section */}
        <div className="bg-secondary/30 rounded-lg p-8 lg:p-12 text-center">
          <h3 className="text-2xl lg:text-3xl font-medium text-foreground mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join thousands of professionals and families who trust SchoolInsights for 
            accurate, actionable school data.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              <Building className="h-5 w-5 mr-2" />
              Start Professional Trial
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="border-border hover:bg-accent">
              <Users className="h-5 w-5 mr-2" />
              Explore for Free
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            14-day free trial • No credit card required • Full access
          </p>
        </div>
      </div>
    </section>
  );
}