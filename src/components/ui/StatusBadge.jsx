import React from 'react';
import { Badge } from '@/components/ui/badge';
import { STATUS_COLORS } from '@/lib/constants';

export default function StatusBadge({ status, className = '' }) {
  if (!status) return null;
  const colorClass = STATUS_COLORS[status] || 'bg-muted text-muted-foreground';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return (
    <Badge variant="secondary" className={`${colorClass} text-xs font-medium ${className}`}>
      {label}
    </Badge>
  );
}