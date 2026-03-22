export const CAPTURE_SESSION_STATUSES = [
  {
    value: 'planning',
    label: 'Planning',
    description: 'Use while defining the segment, required views, and who will capture the work.',
    color: 'bg-muted text-muted-foreground',
  },
  {
    value: 'ready_for_documentation',
    label: 'Ready for Documentation',
    description: 'Route, segment, and staffing are set. The session is ready to be scheduled or started.',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    value: 'recording_in_progress',
    label: 'Recording in Progress',
    description: 'The crew is actively capturing this session in the field right now.',
    color: 'bg-amber-100 text-amber-800',
  },
  {
    value: 'recordings_uploaded',
    label: 'Recordings Uploaded',
    description: 'The raw files are in the system or linked, but review and processing are not finished.',
    color: 'bg-purple-100 text-purple-800',
  },
  {
    value: 'processing',
    label: 'Processing',
    description: 'Previews, thumbnails, matching, or other media prep steps are underway.',
    color: 'bg-indigo-100 text-indigo-800',
  },
  {
    value: 'under_review',
    label: 'Under Review',
    description: 'The session is being checked for quality, completeness, and publish readiness.',
    color: 'bg-fuchsia-100 text-fuchsia-800',
  },
  {
    value: 'approved_for_release',
    label: 'Approved for Release',
    description: 'Internal review is complete and the session can move into the client package.',
    color: 'bg-emerald-100 text-emerald-800',
  },
  {
    value: 'published_to_client',
    label: 'Published to Client',
    description: 'Client-safe outputs from this session are already released in the portal.',
    color: 'bg-green-100 text-green-800',
  },
];

export const CAPTURE_SESSION_STATUS_MAP = Object.fromEntries(CAPTURE_SESSION_STATUSES.map((status) => [status.value, status]));

export const DEFAULT_CAPTURE_SESSION_TEMPLATES = [
  { key: 'right_profile', session_name: 'Right Profile', view_type: 'profile', side_of_street: 'right', capture_method: 'video' },
  { key: 'left_profile', session_name: 'Left Profile', view_type: 'profile', side_of_street: 'left', capture_method: 'video' },
  { key: 'curb_line_edge_of_pavement', session_name: 'Curb Line / Edge of Pavement', view_type: 'curb_line_edge_of_pavement', side_of_street: 'both', capture_method: 'video' },
  { key: 'cross_section', session_name: 'Cross Section', view_type: 'cross_section', side_of_street: 'center', capture_method: 'photo' },
];

export function normalizeCaptureSessionStatus(status) {
  const mapping = {
    planned: 'planning',
    ready: 'ready_for_documentation',
    in_progress: 'recording_in_progress',
    paused: 'recording_in_progress',
    uploaded: 'recordings_uploaded',
    approved: 'approved_for_release',
    published: 'published_to_client',
  };

  return mapping[status] || status || 'planning';
}

export function buildDefaultCaptureSessions({ segment, include360Walk = false, existingSessions = [] }) {
  const existingNames = new Set(existingSessions.map((session) => session.session_name?.trim().toLowerCase()).filter(Boolean));
  const templates = include360Walk
    ? [...DEFAULT_CAPTURE_SESSION_TEMPLATES, { key: '360_walk', session_name: '360 Walk', view_type: '360_walk', side_of_street: 'both', capture_method: 'video_360' }]
    : DEFAULT_CAPTURE_SESSION_TEMPLATES;

  return templates
    .filter((template) => !existingNames.has(template.session_name.toLowerCase()))
    .map((template, index) => ({
      project_id: segment.project_id,
      street_segment_id: segment.id,
      session_name: template.session_name,
      session_code: [segment.segment_code, template.key.toUpperCase()].filter(Boolean).join('-'),
      session_status: 'planning',
      capture_method: template.capture_method,
      view_type: template.view_type,
      side_of_street: template.side_of_street,
      route_capture_mode: 'manual_route',
      walking_direction_description: [segment.from_intersection, segment.to_intersection].filter(Boolean).join(' to '),
      sequence_order: existingSessions.length + index,
      qa_status: 'not_reviewed',
      auto_generated: true,
    }));
}

export function getSessionOrderLabel(session, index) {
  return typeof session.sequence_order === 'number' ? session.sequence_order + 1 : index + 1;
}
