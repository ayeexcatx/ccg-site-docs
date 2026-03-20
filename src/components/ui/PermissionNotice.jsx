import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

export default function PermissionNotice({
  title = 'Permission and visibility guidance',
  audience = [],
  internalData,
  clientVisibleData,
  publishingEffect,
  mistakesToAvoid,
}) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">Permission-sensitive page</Badge>
        </div>
        <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="font-medium mb-1">Who can access this page</p>
          <p className="text-muted-foreground leading-6">{audience.join(' ')}</p>
        </div>
        <div>
          <p className="font-medium mb-1">What data is internal</p>
          <p className="text-muted-foreground leading-6">{internalData}</p>
        </div>
        <div>
          <p className="font-medium mb-1">What data is client-visible</p>
          <p className="text-muted-foreground leading-6">{clientVisibleData}</p>
        </div>
        <div>
          <p className="font-medium mb-1">How publishing affects visibility</p>
          <p className="text-muted-foreground leading-6">{publishingEffect}</p>
        </div>
        <div>
          <p className="font-medium mb-1">Mistakes to avoid</p>
          <p className="text-muted-foreground leading-6">{mistakesToAvoid}</p>
        </div>
      </CardContent>
    </Card>
  );
}
