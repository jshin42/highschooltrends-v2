import React, { useState } from 'react';
import { Search, MapPin, Menu, X, User, Building, Home, Shield, TrendingUp, GraduationCap } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

export function ProfessionalHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
      {/* Top bar */}
      <div className="bg-blue-600 text-white">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Trusted by 25,000+ families nationwide</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <span>For Realtors</span>
              <span>•</span>
              <span>For Parents</span>
              <span>•</span>
              <span>Help: (855) HST-REND</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Home className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-medium text-foreground">HighSchoolTrends.org</h1>
              <p className="text-xs text-muted-foreground">School Data Intelligence Platform</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            <a href="#" className="text-foreground hover:text-blue-600 transition-colors flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Schools
            </a>
            <a href="#" className="text-foreground hover:text-blue-600 transition-colors flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Market Analysis
            </a>
            <a href="#" className="text-foreground hover:text-blue-600 transition-colors flex items-center gap-2">
              <Building className="h-4 w-4" />
              Professional Tools
            </a>
            <a href="#" className="text-foreground hover:text-blue-600 transition-colors">Resources</a>
          </nav>

          {/* User actions */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="hidden md:inline-flex text-blue-600 hover:bg-blue-50">
              <Building className="h-4 w-4 mr-2" />
              For Realtors
            </Button>
            <Button variant="outline" size="sm" className="border-blue-200 text-blue-600 hover:bg-blue-50">
              <User className="h-4 w-4 mr-2" />
              Sign In
            </Button>
            
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* School Search Bar */}
        <div className="mt-4">
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center bg-white rounded-lg border-2 border-gray-200 shadow-sm hover:border-blue-300 transition-colors overflow-hidden">
              <div className="flex items-center px-4 py-3 bg-gray-50 border-r border-gray-200">
                <GraduationCap className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-600 whitespace-nowrap">School</span>
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Enter school name, district, or ZIP code..."
                  className="pl-12 pr-4 py-3 border-0 bg-transparent focus:ring-0 text-foreground placeholder:text-gray-400"
                />
              </div>
              <Button className="rounded-none px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* User type indicators */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Building className="h-3 w-3 mr-1" />
            Real Estate Professionals
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Home className="h-3 w-3 mr-1" />
            Parents & Families
          </Badge>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card">
          <nav className="container mx-auto px-4 py-4 space-y-3">
            <a href="#" className="block py-2 text-foreground hover:text-blue-600 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search Schools
            </a>
            <a href="#" className="block py-2 text-foreground hover:text-blue-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Market Analysis
            </a>
            <a href="#" className="block py-2 text-foreground hover:text-blue-600 flex items-center gap-2">
              <Building className="h-4 w-4" />
              Professional Tools
            </a>
            <a href="#" className="block py-2 text-foreground hover:text-blue-600">Resources</a>
            <div className="pt-3 border-t border-border">
              <Button variant="outline" size="sm" className="w-full mb-2 border-blue-200 text-blue-600">
                <Building className="h-4 w-4 mr-2" />
                For Realtors
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}