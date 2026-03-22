
import { CAPTURE_SESSION_STATUSES } from '@/lib/sessionWorkflow';

// Status badge color mapping
export const STATUS_COLORS = {
  // Project status
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-blue-100 text-blue-800',
  in_review: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-gray-100 text-gray-500',
  // Documentation status
  not_started: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  uploaded: 'bg-purple-100 text-purple-800',
  reviewed: 'bg-teal-100 text-teal-800',
  // Session status
  ...Object.fromEntries(CAPTURE_SESSION_STATUSES.map((status) => [status.value, status.color])),
  // QA status
  not_reviewed: 'bg-muted text-muted-foreground',
  needs_review: 'bg-amber-100 text-amber-800',
  flagged: 'bg-red-100 text-red-800',
  // General
  open: 'bg-blue-100 text-blue-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-gray-100 text-gray-500',
  complete: 'bg-emerald-100 text-emerald-800',
  error: 'bg-red-100 text-red-800',
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-purple-100 text-purple-800',
  // Client org
  inactive: 'bg-gray-100 text-gray-500',
};

export const VIEW_TYPE_LABELS = {
  profile: 'Profile View',
  curb_line_edge_of_pavement: 'Curb Line / Edge of Pavement',
  cross_section: 'Cross Section',
  '360_walk': '360° Walk',
  video_360_stationary: '360° Stationary View',
  reverse_view: 'Reverse View',
  custom: 'Custom View',
};

export const SEGMENT_TYPE_LABELS = {
  street: 'Street',
  block: 'Block',
  curb_ramp_group: 'Curb Ramp Group',
  intersection_group: 'Intersection Group',
  custom_segment: 'Custom Segment',
};

export const ASSET_TYPE_LABELS = {
  intersection: 'Intersection',
  curb_ramp: 'Curb Ramp',
  driveway: 'Driveway',
  sidewalk_panel: 'Sidewalk Panel',
  sign: 'Sign',
  utility_structure: 'Utility Structure',
  business: 'Business',
  landmark: 'Landmark',
  property_frontage: 'Property Frontage',
  custom: 'Custom',
};

export const MARKER_TYPE_LABELS = {
  start: 'Start',
  end: 'End',
  intersection: 'Intersection',
  curb_ramp: 'Curb Ramp',
  address_anchor: 'Address Anchor',
  landmark: 'Landmark',
  issue_note: 'Issue Note',
  business: 'Business',
  sign: 'Sign',
  custom: 'Custom',
};

export const CHECKPOINT_TYPE_LABELS = {
  start: 'Start',
  end: 'End',
  intersection: 'Intersection',
  curb_ramp: 'Curb Ramp',
  address_anchor: 'Address Anchor',
  landmark: 'Landmark',
  issue_note: 'Issue Note',
  custom: 'Custom',
};