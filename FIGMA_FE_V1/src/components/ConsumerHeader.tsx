import React from 'react';
import { Search, Share2, Bookmark, TrendingUp, Sparkles, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

export function ConsumerHeader() {
  return (
    <header className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        {/* Top section */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold">📚</span>
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                <Sparkles className="h-2 w-2 text-yellow-800" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold">SchoolVibes</h1>
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs opacity-90">#1 School Trends</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button size="sm" className="bg-white text-purple-600 hover:bg-white/90 font-bold">
              <Crown className="h-4 w-4 mr-1" />
              Go Pro
            </Button>
          </div>
        </div>

        {/* Search section */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder="Search schools, compare rankings, discover trends..."
            className="pl-12 pr-4 py-3 bg-white/95 backdrop-blur-sm border-0 rounded-full text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-white/50"
          />
        </div>

        {/* Trending tags */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
          <span className="text-sm opacity-90 whitespace-nowrap">Trending:</span>
          <div className="flex gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              🔥 Top Rankings
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              📈 Rising Schools
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              🏆 Best in State
            </Badge>
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30 hover:bg-white/30">
              ⭐ Hidden Gems
            </Badge>
          </div>
        </div>
      </div>
    </header>
  );
}