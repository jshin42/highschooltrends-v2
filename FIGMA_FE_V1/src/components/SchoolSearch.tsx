import React, { useState, useMemo } from 'react';
import { Search, X, Plus } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface School {
  name: string;
  location: string;
  metrics: Record<string, any>;
}

interface SchoolSearchProps {
  schools: School[];
  selectedSchools: School[];
  onSchoolsChange: (schools: School[]) => void;
  maxSelections?: number;
}

export function SchoolSearch({ schools, selectedSchools, onSchoolsChange, maxSelections = 2 }: SchoolSearchProps) {
  const [searchValue, setSearchValue] = useState('');
  const [showResults, setShowResults] = useState(false);

  const filteredSchools = useMemo(() => {
    if (!searchValue) return [];
    return schools.filter(school => 
      school.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      school.location.toLowerCase().includes(searchValue.toLowerCase())
    ).slice(0, 8); // Limit to 8 results
  }, [schools, searchValue]);

  const handleSelect = (school: School) => {
    const isSelected = selectedSchools.some(s => s.name === school.name);
    
    if (!isSelected && selectedSchools.length < maxSelections) {
      onSchoolsChange([...selectedSchools, school]);
    }
    
    setSearchValue('');
    setShowResults(false);
  };

  const handleRemove = (schoolToRemove: School) => {
    onSchoolsChange(selectedSchools.filter(s => s.name !== schoolToRemove.name));
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setShowResults(value.length > 0);
  };

  const availableSchools = filteredSchools.filter(school => 
    !selectedSchools.some(s => s.name === school.name)
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block font-medium">Search Schools</label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by school name or location..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowResults(searchValue.length > 0)}
            className="pl-10"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-6 w-6 p-0"
              onClick={() => {
                setSearchValue('');
                setShowResults(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Results */}
        {showResults && availableSchools.length > 0 && (
          <Card className="absolute z-10 w-full mt-1">
            <CardContent className="p-2">
              <div className="space-y-1">
                {availableSchools.map((school) => (
                  <Button
                    key={school.name}
                    variant="ghost"
                    className="w-full justify-start h-auto p-2 text-left"
                    onClick={() => handleSelect(school)}
                    disabled={selectedSchools.length >= maxSelections}
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{school.name}</div>
                        <div className="text-sm text-muted-foreground">{school.location}</div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected Schools */}
      <div className="space-y-2">
        <label className="block font-medium">
          Selected Schools ({selectedSchools.length}/{maxSelections})
        </label>
        {selectedSchools.length > 0 ? (
          <div className="space-y-2">
            {selectedSchools.map((school, index) => (
              <div key={school.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">
                    School {index + 1}
                  </Badge>
                  <div>
                    <div className="font-medium">{school.name}</div>
                    <div className="text-sm text-muted-foreground">{school.location}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(school)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Use the search bar above to find and select schools
          </div>
        )}
      </div>
    </div>
  );
}