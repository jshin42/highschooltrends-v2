import React, { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Button } from './ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Badge } from './ui/badge';

interface School {
  name: string;
  location: string;
  metrics: Record<string, any>;
}

interface SchoolSelectorProps {
  schools: School[];
  selectedSchools: School[];
  onSchoolsChange: (schools: School[]) => void;
  maxSelections?: number;
}

export function SchoolSelector({ schools, selectedSchools, onSchoolsChange, maxSelections = 2 }: SchoolSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredSchools = useMemo(() => {
    if (!searchValue) return schools;
    return schools.filter(school => 
      school.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      school.location.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [schools, searchValue]);

  const handleSelect = (school: School) => {
    const isSelected = selectedSchools.some(s => s.name === school.name);
    
    if (isSelected) {
      onSchoolsChange(selectedSchools.filter(s => s.name !== school.name));
    } else if (selectedSchools.length < maxSelections) {
      onSchoolsChange([...selectedSchools, school]);
    }
  };

  const handleRemove = (schoolToRemove: School) => {
    onSchoolsChange(selectedSchools.filter(s => s.name !== schoolToRemove.name));
  };

  return (
    <div className="space-y-2">
      <label className="block">Select Schools (max {maxSelections})</label>
      
      {/* Selected schools display */}
      {selectedSchools.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedSchools.map((school, index) => (
            <Badge key={school.name} variant="secondary" className="flex items-center gap-1">
              <span className="truncate max-w-[200px]">{school.name}</span>
              <button
                onClick={() => handleRemove(school)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* School selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={selectedSchools.length >= maxSelections}
          >
            {selectedSchools.length === 0 
              ? "Choose schools..."
              : `${selectedSchools.length} of ${maxSelections} selected`
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput 
              placeholder="Search schools..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No schools found.</CommandEmpty>
              <CommandGroup>
                {filteredSchools.map((school) => {
                  const isSelected = selectedSchools.some(s => s.name === school.name);
                  const isDisabled = !isSelected && selectedSchools.length >= maxSelections;
                  
                  return (
                    <CommandItem
                      key={school.name}
                      value={school.name}
                      onSelect={() => handleSelect(school)}
                      disabled={isDisabled}
                      className={isDisabled ? 'opacity-50' : ''}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${isSelected ? 'opacity-100' : 'opacity-0'}`}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{school.name}</span>
                        <span className="text-sm text-muted-foreground">{school.location}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}