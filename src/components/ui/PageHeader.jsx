import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function PageHeader({ title, description, helpText, children }) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {helpText && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-4 h-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-sm text-sm">
                    {helpText}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">{children}</div>
      </div>
    </div>
  );
}