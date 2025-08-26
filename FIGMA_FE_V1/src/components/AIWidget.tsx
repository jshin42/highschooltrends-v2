import React, { useState } from 'react';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';

interface School {
  name: string;
  location: string;
  metrics: Record<string, any>;
}

interface AIWidgetProps {
  schools: School[];
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export function AIWidget({ schools }: AIWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: "Hi! I'm your AI assistant. Ask me anything about school trends, like 'Which school improved most in graduation rates?' or 'Compare AP performance across schools.'",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock AI response function - in production, this would call your serverless function
  const generateAIResponse = async (question: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simple pattern matching for demo
    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('best') || lowerQuestion.includes('highest')) {
      const topSchool = schools.find(s => s.metrics['2025']?.national_rank === 1);
      return `Based on the data, **${topSchool?.name}** ranks #1 nationally with an overall score of ${topSchool?.metrics['2025']?.overall_score}. They maintain excellent performance across all metrics including ${topSchool?.metrics['2025']?.graduation_rate_pct}% graduation rate and ${topSchool?.metrics['2025']?.ap_pass_pct}% AP pass rate.`;
    }
    
    if (lowerQuestion.includes('graduation') || lowerQuestion.includes('grad rate')) {
      const schoolsWithGradRates = schools
        .map(s => ({
          name: s.name,
          rate2019: s.metrics['2019']?.graduation_rate_pct || 0,
          rate2025: s.metrics['2025']?.graduation_rate_pct || 0
        }))
        .map(s => ({ ...s, improvement: s.rate2025 - s.rate2019 }))
        .sort((a, b) => b.improvement - a.improvement);
      
      const topImprover = schoolsWithGradRates[0];
      return `**${topImprover.name}** showed the most improvement in graduation rates, increasing from ${topImprover.rate2019}% in 2019 to ${topImprover.rate2025}% in 2025 (${topImprover.improvement > 0 ? '+' : ''}${topImprover.improvement.toFixed(1)} percentage points).`;
    }
    
    if (lowerQuestion.includes('ap') || lowerQuestion.includes('advanced placement')) {
      const avgAPPass = schools.reduce((sum, s) => sum + (s.metrics['2025']?.ap_pass_pct || 0), 0) / schools.length;
      return `The average AP pass rate across all tracked schools in 2025 is ${avgAPPass.toFixed(1)}%. Schools like **Thomas Jefferson** lead with ${schools[0]?.metrics['2025']?.ap_pass_pct}% pass rate, while maintaining ${schools[0]?.metrics['2025']?.ap_participation_pct}% participation rate.`;
    }
    
    if (lowerQuestion.includes('enrollment') || lowerQuestion.includes('size')) {
      const largestSchool = schools.reduce((largest, school) => 
        (school.metrics['2025']?.enrollment || 0) > (largest.metrics['2025']?.enrollment || 0) ? school : largest
      );
      const smallestSchool = schools.reduce((smallest, school) => 
        (school.metrics['2025']?.enrollment || Infinity) < (smallest.metrics['2025']?.enrollment || Infinity) ? school : smallest
      );
      
      return `**${largestSchool.name}** has the highest enrollment with ${largestSchool.metrics['2025']?.enrollment?.toLocaleString()} students, while **${smallestSchool.name}** is the smallest with ${smallestSchool.metrics['2025']?.enrollment?.toLocaleString()} students. School size doesn't directly correlate with performance - both maintain excellent rankings.`;
    }
    
    // Default response
    return `That's an interesting question about school trends! Based on the available data from ${schools.length} top-performing schools from 2019-2025, I can help you analyze metrics like graduation rates, AP performance, enrollment changes, and overall scores. Try asking about specific metrics or comparisons between schools.`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const aiResponse = await generateAIResponse(input);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI response error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "Sorry, I encountered an error processing your question. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-shadow"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px]">
      <Card className="h-full flex flex-col shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-4 space-y-4">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div dangerouslySetInnerHTML={{ 
                      __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                    }} />
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing data...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="flex gap-2">
            <Input
              placeholder="Ask about school trends..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            Try: "Which school improved most?" or "Compare AP scores"
          </div>
        </CardContent>
      </Card>
    </div>
  );
}