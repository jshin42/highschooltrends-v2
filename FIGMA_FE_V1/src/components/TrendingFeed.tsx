import React from 'react';
import { TrendingUp, TrendingDown, Flame, Star, Share2, Heart, MessageCircle } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';

interface School {
  name: string;
  location: string;
  metrics: Record<string, any>;
}

interface TrendingFeedProps {
  schools: School[];
}

export function TrendingFeed({ schools }: TrendingFeedProps) {
  // Create viral-style content from school data
  const trendingPosts = schools.slice(0, 8).map((school, index) => {
    const currentMetrics = school.metrics['2025'] || {};
    const pastMetrics = school.metrics['2024'] || {};
    
    const scoreTrend = currentMetrics.overall_score - (pastMetrics.overall_score || 0);
    const isHot = index < 3;
    const isRising = scoreTrend > 0;
    
    const viralTitles = [
      `🔥 ${school.name} just CRUSHED the rankings!`,
      `This school's glow-up is UNREAL 📈`,
      `POV: Your dream school is actually affordable`,
      `${school.name} said "we're HIM" and meant it`,
      `This hidden gem is about to blow up 💎`,
      `Tell me you go to ${school.name} without telling me`,
      `${school.name} really said "watch this" 💪`,
      `The education system if every school was like this:`
    ];

    const engagementStats = {
      likes: Math.floor(Math.random() * 10000) + 1000,
      comments: Math.floor(Math.random() * 500) + 50,
      shares: Math.floor(Math.random() * 1000) + 100,
    };

    return {
      id: index,
      school,
      title: viralTitles[index] || `${school.name} is trending!`,
      isHot,
      isRising,
      trend: scoreTrend,
      timeAgo: `${Math.floor(Math.random() * 12) + 1}h`,
      engagement: engagementStats,
      author: {
        name: ['SchoolTok', 'EduVibes', 'RankingsDaily', 'SchoolScoop'][Math.floor(Math.random() * 4)],
        verified: Math.random() > 0.5
      }
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-orange-500" />
          <h2 className="text-xl font-bold">Trending Now</h2>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-orange-100 to-red-100 text-orange-700">
          Updated 2min ago
        </Badge>
      </div>

      {/* Trending posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trendingPosts.map((post) => (
          <Card key={post.id} className="relative overflow-hidden hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-white to-gray-50">
            {post.isHot && (
              <div className="absolute top-2 left-2 z-10">
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                  <Flame className="h-3 w-3 mr-1" />
                  HOT
                </Badge>
              </div>
            )}
            
            <CardContent className="p-4">
              {/* Author */}
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                    {post.author.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-sm">{post.author.name}</span>
                  {post.author.verified && (
                    <Star className="h-3 w-3 text-blue-500 fill-current" />
                  )}
                </div>
                <span className="text-xs text-gray-500 ml-auto">{post.timeAgo}</span>
              </div>

              {/* Content */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm leading-tight">{post.title}</h3>
                
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{post.school.name}</span>
                    <div className="flex items-center gap-1">
                      {post.isRising ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        post.isRising ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {post.isRising ? '+' : ''}{post.trend.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{post.school.location}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="font-bold text-sm">#{post.school.metrics['2025']?.national_rank}</div>
                      <div className="text-xs text-gray-500">Rank</div>
                    </div>
                    <div>
                      <div className="font-bold text-sm">{post.school.metrics['2025']?.overall_score}</div>
                      <div className="text-xs text-gray-500">Score</div>
                    </div>
                    <div>
                      <div className="font-bold text-sm">{post.school.metrics['2025']?.graduation_rate_pct}%</div>
                      <div className="text-xs text-gray-500">Grad Rate</div>
                    </div>
                  </div>
                </div>

                {/* Engagement */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-red-500 p-1">
                      <Heart className="h-4 w-4 mr-1" />
                      <span className="text-xs">{(post.engagement.likes / 1000).toFixed(1)}K</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-500 p-1">
                      <MessageCircle className="h-4 w-4 mr-1" />
                      <span className="text-xs">{post.engagement.comments}</span>
                    </Button>
                  </div>
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-green-500 p-1">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View more */}
      <div className="text-center">
        <Button variant="outline" className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600">
          Load More Trending Schools
        </Button>
      </div>
    </div>
  );
}