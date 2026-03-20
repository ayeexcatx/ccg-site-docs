import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export default function FutureReadyPanel({
  title = 'Future-ready extension notes',
  description,
  items = [],
}) {
  if (!items.length) return null;

  return (
    <Card className="border-dashed border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        {description && <p className="text-sm leading-6 text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.key || item.title} className="rounded-lg border bg-background p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.status && <Badge variant="secondary">{item.status}</Badge>}
            </div>
            {item.summary && <p className="text-sm leading-6 text-muted-foreground">{item.summary}</p>}
            {item.workflow && <p className="mt-2 text-sm leading-6 text-muted-foreground"><span className="font-medium text-foreground">Workflow fit:</span> {item.workflow}</p>}
            {item.entities?.length > 0 && <p className="mt-2 text-sm leading-6 text-muted-foreground"><span className="font-medium text-foreground">Current entities:</span> {item.entities.join(', ')}</p>}
            {item.extensionPoints?.length > 0 && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                {item.extensionPoints.map((point, index) => <li key={index}>{point}</li>)}
              </ul>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
