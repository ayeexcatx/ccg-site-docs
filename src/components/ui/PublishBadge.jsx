import React from 'react';
import { Badge } from '@/components/ui/badge';

const BADGE_STYLES = {
  internal_only: 'border-slate-300 bg-slate-200 text-slate-900',
  client_visible: 'border-emerald-300 bg-emerald-100 text-emerald-900',
  needs_review: 'border-amber-300 bg-amber-100 text-amber-900',
  publish_blocked: 'border-red-300 bg-red-100 text-red-900',
  publish_ready: 'border-blue-300 bg-blue-100 text-blue-900',
  draft_data: 'border-slate-300 bg-slate-100 text-slate-900',
  internally_reviewed: 'border-indigo-300 bg-indigo-100 text-indigo-900',
  client_published: 'border-emerald-300 bg-emerald-100 text-emerald-900',
};

const BADGE_LABELS = {
  internal_only: 'Internal Only',
  client_visible: 'Client Visible',
  needs_review: 'Needs Review',
  publish_blocked: 'Publish Blocked',
  publish_ready: 'Publish Ready',
  draft_data: 'Draft Data',
  internally_reviewed: 'Internally Reviewed',
  client_published: 'Client Published',
};

export default function PublishBadge({ state }) {
  if (!state) return null;
  return <Badge className={BADGE_STYLES[state] || 'border-border'}>{BADGE_LABELS[state] || state}</Badge>;
}
