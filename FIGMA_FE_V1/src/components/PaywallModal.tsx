import React from 'react';
import { Crown, Sparkles, Zap, TrendingUp, X, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

export function PaywallModal({ isOpen, onClose, feature }: PaywallModalProps) {
  const proFeatures = [
    { icon: Sparkles, text: "AI-Powered School Analysis", popular: true },
    { icon: TrendingUp, text: "Advanced Trend Predictions", popular: false },
    { icon: Zap, text: "Instant Snapshot Reports", popular: true },
    { icon: Crown, text: "Priority School Comparisons", popular: false },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Unlock Pro Features
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Feature highlight */}
          <div className="text-center p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
            <Crown className="h-12 w-12 text-purple-600 mx-auto mb-2" />
            <h3 className="font-bold text-lg text-purple-900 mb-1">
              {feature} is Pro Only!
            </h3>
            <p className="text-purple-700 text-sm">
              Unlock AI insights and advanced analytics to discover the best schools
            </p>
          </div>

          {/* Pro features list */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">What you'll get:</h4>
            {proFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  feature.popular ? 'bg-purple-100' : 'bg-gray-100'
                }`}>
                  <feature.icon className={`h-4 w-4 ${
                    feature.popular ? 'text-purple-600' : 'text-gray-600'
                  }`} />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-900">
                  {feature.text}
                </span>
                {feature.popular && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                    Popular
                  </Badge>
                )}
                <Check className="h-4 w-4 text-green-500" />
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl p-4 border border-purple-200">
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-3xl font-bold text-purple-600">$4.99</span>
                <div className="text-left">
                  <div className="text-sm text-gray-500 line-through">$9.99</div>
                  <div className="text-sm font-medium text-green-600">50% OFF</div>
                </div>
              </div>
              <p className="text-sm text-gray-600">per month • Cancel anytime</p>
            </div>
            
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 rounded-xl">
              <Crown className="h-4 w-4 mr-2" />
              Start Free Trial
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-2">
              7-day free trial • No commitment
            </p>
          </div>

          {/* Social proof */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-yellow-400">⭐</span>
              ))}
            </div>
            <p className="text-sm text-gray-600">
              Join <span className="font-bold text-purple-600">50K+</span> users discovering their perfect schools
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}