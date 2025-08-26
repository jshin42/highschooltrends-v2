import React from 'react';

interface AdPlaceholderProps {
  width: number;
  height: number;
  id: string;
  label: string;
}

export function AdPlaceholder({ width, height, id, label }: AdPlaceholderProps) {
  return (
    <div
      id={id}
      className="bg-muted/30 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div className="text-center text-muted-foreground">
        <p className="text-sm">{label}</p>
        <p className="text-xs">{width}×{height}</p>
      </div>
    </div>
  );
}