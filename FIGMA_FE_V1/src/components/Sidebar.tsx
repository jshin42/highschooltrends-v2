import React from 'react';
import { 
  BarChart3, 
  Map, 
  FileText, 
  Bot, 
  Home, 
  TrendingUp, 
  Users, 
  Download,
  HelpCircle,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home, badge: null },
  { id: 'trends', label: 'Trends Analysis', icon: BarChart3, badge: null },
  { id: 'comparison', label: 'School Compare', icon: FileText, badge: null },
  { id: 'regional', label: 'Regional Insights', icon: Map, badge: null },
  { id: 'ai', label: 'AI Assistant', icon: Bot, badge: 'New' },
];

const secondaryItems = [
  { id: 'reports', label: 'Reports', icon: Download },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
];

export function Sidebar({ activeTab, onTabChange, isOpen = true, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden" onClick={onClose} />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 transition-transform duration-200 ease-in-out
        flex flex-col
      `}>
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
          <span className="text-lg font-semibold text-gray-900">Navigation</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                  ${activeTab === item.id 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="flex-1 font-medium">{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                    {item.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>

          <Separator className="my-4" />

          <div className="space-y-1">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tools & Resources
              </h3>
            </div>
            {secondaryItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-50"
              >
                <item.icon className="h-5 w-5 text-gray-500" />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="p-4 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm font-medium text-gray-900">Pro Plan</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">
              Unlimited access to all school data and AI features
            </p>
            <Button size="sm" variant="outline" className="w-full text-xs">
              Manage Plan
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}