import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, ShieldAlert } from 'lucide-react';

const DEFAULT_DISCLAIMER = 'AI is an assistant only, not a source of final truth. Every AI-generated draft suggestion must be reviewed, edited as needed, and approved by staff before it can become part of the evidence workflow or any client-visible output.';

export default function AiDraftSuggestionPanel({
  title = 'AI draft suggestion workbench',
  description,
  suggestions = [],
  emptyMessage = 'No draft AI suggestions are connected yet. This reserved area exists so future internal suggestion services can plug into the current manual review workflow without changing how staff approve evidence.',
  disclaimer = DEFAULT_DISCLAIMER,
  reviewStateMap = {},
  onReviewAction,
}) {
  return (
    <Card className="border-dashed border-purple-300 bg-purple-50/40">
      <CardHeader className="space-y-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-purple-700" />
            {title}
          </CardTitle>
          {description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>}
        </div>
        <Alert className="border-purple-200 bg-background">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Draft-only assistant layer</AlertTitle>
          <AlertDescription className="leading-6">{disclaimer}</AlertDescription>
        </Alert>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.length === 0 ? (
          <div className="rounded-lg border bg-background p-4 text-sm leading-6 text-muted-foreground">{emptyMessage}</div>
        ) : (
          suggestions.map((suggestion) => {
            const reviewState = reviewStateMap[suggestion.id] || 'awaiting_staff_review';
            return (
              <div key={suggestion.id} className="rounded-lg border bg-background p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{suggestion.title}</p>
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Draft / Unconfirmed</Badge>
                  <Badge variant="outline">{reviewState.replace(/_/g, ' ')}</Badge>
                  {suggestion.badges?.map((badge) => <Badge key={badge} variant="secondary">{badge}</Badge>)}
                </div>
                {suggestion.summary && <p className="text-sm leading-6 text-muted-foreground">{suggestion.summary}</p>}
                {suggestion.fields?.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {suggestion.fields.map((field) => (
                      <div key={`${suggestion.id}-${field.label}`} className="rounded-md border bg-muted/20 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</p>
                        <p className="mt-1 text-sm font-medium">{field.value || '—'}</p>
                        {field.helper && <p className="mt-1 text-xs leading-5 text-muted-foreground">{field.helper}</p>}
                      </div>
                    ))}
                  </div>
                )}
                {suggestion.reviewNote && <p className="text-xs leading-5 text-muted-foreground">Review note: {suggestion.reviewNote}</p>}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => onReviewAction?.(suggestion.id, 'accepted_for_manual_merge')}>Accept Draft</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => onReviewAction?.(suggestion.id, 'needs_manual_edit')}>Edit Before Use</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onReviewAction?.(suggestion.id, 'rejected_by_staff')}>Reject Draft</Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
