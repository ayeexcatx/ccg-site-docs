import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

export default function HowThisWorks({ title = "How This Works", items = [] }) {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  
  return (
    <div className="mb-6 border border-border rounded-lg bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <span>{title}</span>
        {open ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 text-sm text-muted-foreground">
              <span className="text-primary font-semibold mt-0.5">{i + 1}.</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}