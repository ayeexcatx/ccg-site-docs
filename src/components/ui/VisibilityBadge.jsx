import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getVisibilityLabel } from '@/lib/displayUtils';

const VARIANTS = {
  internal_only: 'border border-slate-300 bg-slate-200 text-slate-900',
  client_visible: 'border border-emerald-300 bg-emerald-100 text-emerald-900',
  needs_review: 'border border-amber-300 bg-amber-100 text-amber-900',
};

const LABELS = {
  internal_only: 'Internal Only',
  client_visible: 'Client Visible',
  needs_review: 'Needs Review',
};

export default function VisibilityBadge({ visibility }) {
  if (!visibility) return null;
  return <Badge className={VARIANTS[visibility] || 'bg-muted text-muted-foreground'}>{LABELS[visibility] || getVisibilityLabel(visibility)}</Badge>;
}

export const VISIBILITY_EXPLANATIONS = [
  { key: 'internal_only', label: 'Internal Only', description: 'Visible only to company-side users. Use for QA notes, reviewer guidance, and operational context.' },
  { key: 'client_visible', label: 'Client Visible', description: 'Approved for client-facing pages after publishing controls allow release.' },
  { key: 'needs_review', label: 'Needs Review', description: 'Not ready for client release. Content may still require factual, tone, or privacy review.' },
];
