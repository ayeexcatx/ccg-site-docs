import { base44 } from '@/api/base44Client';

const safeList = async (entityName, sort = '-created_date', limit = 200) => {
  try {
    return await base44.entities[entityName].list(sort, limit);
  } catch (error) {
    console.error(`Failed to list ${entityName}`, error);
    return [];
  }
};

export async function createCaptureSessionForSegment({ projectId, streetSegmentId, sessionName, sessionData = {} }) {
  return base44.entities.CaptureSession.create({
    project_id: projectId,
    street_segment_id: streetSegmentId,
    session_name: sessionName,
    session_status: 'planned',
    qa_status: 'not_reviewed',
    ...sessionData,
  });
}

export async function saveDrawnRoutePath({ existingRouteId, session, routeName, routePoints, checkpoints = [], templateName = '' }) {
  const routeData = {
    project_id: session?.project_id || '',
    street_segment_id: session?.street_segment_id || '',
    capture_session_id: session?.id || '',
    route_name: routeName || templateName || 'Route',
    route_mode: templateName ? 'template_seeded' : 'drawn_on_map',
    polyline_json: JSON.stringify(routePoints || []),
    start_latitude: routePoints?.[0]?.lat,
    start_longitude: routePoints?.[0]?.lng,
    end_latitude: routePoints?.[routePoints.length - 1]?.lat,
    end_longitude: routePoints?.[routePoints.length - 1]?.lng,
    has_checkpoints: checkpoints.length > 0,
  };

  if (existingRouteId) {
    return base44.entities.RoutePath.update(existingRouteId, routeData);
  }

  return base44.entities.RoutePath.create(routeData);
}

export async function addRouteCheckpoint({ session, routePathId, checkpoint, sequenceOrder }) {
  return base44.entities.RouteCheckpoint.create({
    project_id: session?.project_id || '',
    street_segment_id: session?.street_segment_id || '',
    capture_session_id: session?.id || '',
    route_path_id: routePathId || '',
    checkpoint_type: checkpoint.checkpoint_type,
    checkpoint_label: checkpoint.checkpoint_label,
    sequence_order: sequenceOrder,
    map_latitude: checkpoint.map_latitude,
    map_longitude: checkpoint.map_longitude,
    is_client_visible: checkpoint.is_client_visible ?? true,
    internal_notes: checkpoint.internal_notes || '',
  });
}

export async function reorderRouteCheckpoints(checkpoints = []) {
  await Promise.all(
    checkpoints.map((checkpoint, index) =>
      base44.entities.RouteCheckpoint.update(checkpoint.id, {
        sequence_order: index,
      })
    )
  );
  return true;
}

export async function logFieldSessionEvent({ session, eventType, eventLabel, eventNote, timestampOffsetSeconds, eventData = {} }) {
  return base44.entities.FieldSessionEvent.create({
    capture_session_id: session?.id || '',
    project_id: session?.project_id || '',
    street_segment_id: session?.street_segment_id || '',
    event_type: eventType,
    event_label: eventLabel,
    event_note: eventNote || '',
    timestamp_offset_seconds: timestampOffsetSeconds || 0,
    ...eventData,
  });
}

export function estimateCheckpointTimestampsFromSessionEvents({ checkpoints = [], events = [] }) {
  const eventLookup = [...events].sort((a, b) => (a.timestamp_offset_seconds || 0) - (b.timestamp_offset_seconds || 0));
  return checkpoints.map((checkpoint, index) => {
    const event = eventLookup[index] || eventLookup[eventLookup.length - 1] || null;
    return {
      checkpoint_id: checkpoint.id,
      checkpoint_label: checkpoint.checkpoint_label,
      estimated_timestamp_seconds: event?.timestamp_offset_seconds ?? null,
      source_event_type: event?.event_type || null,
    };
  });
}

export function createMarkerFromCheckpoint({ checkpoint, mediaFileId, timestampSeconds = 0, confidenceLevel = 'estimated' }) {
  return {
    project_id: checkpoint.project_id || '',
    media_file_id: mediaFileId,
    route_checkpoint_id: checkpoint.id,
    marker_type: checkpoint.checkpoint_type || 'custom',
    marker_label: checkpoint.checkpoint_label || 'Checkpoint Marker',
    timestamp_seconds: timestampSeconds,
    confidence_level: confidenceLevel,
    is_client_visible: checkpoint.is_client_visible ?? true,
    internal_notes: checkpoint.internal_notes || '',
  };
}

export async function syncMarkersFromRouteAndDuration({ checkpoints = [], mediaFiles = [], estimatedTimeline = [] }) {
  const targetMedia = mediaFiles[0];
  if (!targetMedia) return [];

  const existing = await base44.entities.MediaMarker.filter({ media_file_id: targetMedia.id });
  const existingByCheckpoint = new Map(existing.map((marker) => [marker.route_checkpoint_id, marker]));

  const operations = estimatedTimeline
    .filter((item) => item.estimated_timestamp_seconds !== null)
    .map((item) => {
      const checkpoint = checkpoints.find((entry) => entry.id === item.checkpoint_id);
      if (!checkpoint) return null;
      const payload = createMarkerFromCheckpoint({
        checkpoint,
        mediaFileId: targetMedia.id,
        timestampSeconds: item.estimated_timestamp_seconds,
      });
      const existingMarker = existingByCheckpoint.get(checkpoint.id);
      return existingMarker
        ? base44.entities.MediaMarker.update(existingMarker.id, payload)
        : base44.entities.MediaMarker.create(payload);
    })
    .filter(Boolean);

  return Promise.all(operations);
}

export function validateProjectReadiness({ project, segments = [], sessions = [], media = [], markers = [], routes = [] }) {
  const routeCoverage = segments.length ? routes.length / segments.length : 0;
  const sessionCoverage = segments.length ? sessions.length / segments.length : 0;
  const uploadedSessions = sessions.filter((session) => ['uploaded', 'under_review', 'approved'].includes(session.session_status)).length;
  const reviewedMarkers = markers.filter((marker) => marker.confidence_level === 'confirmed').length;

  return {
    routeCompleteness: Math.min(100, Math.round(routeCoverage * 100)),
    sessionCompleteness: Math.min(100, Math.round(sessionCoverage * 100)),
    uploadReadiness: uploadedSessions === sessions.length && sessions.length > 0,
    reviewReadiness: reviewedMarkers >= Math.max(1, Math.floor(markers.length * 0.6)),
    publishReadiness: !!project?.published_to_client || (uploadedSessions === sessions.length && reviewedMarkers === markers.length && media.length > 0),
  };
}

export async function getRoleAwareDashboardData({ role }) {
  const [projects, sessions, mediaFiles, reviewCases, clients] = await Promise.all([
    safeList('Project', '-created_date', 50),
    safeList('CaptureSession', '-created_date', 20),
    safeList('MediaFile', '-created_date', 50),
    safeList('ReviewCase', '-created_date', 20),
    safeList('ClientOrganization', '-created_date', 50),
  ]);

  if (['client_manager', 'client_viewer'].includes(role)) {
    return {
      projects: projects.filter((project) => project.published_to_client),
      sessions: [],
      mediaFiles: [],
      reviewCases: [],
      clients: [],
    };
  }

  return { projects, sessions, mediaFiles, reviewCases, clients };
}

export async function loadSystemInstructionsForPage({ pageKey, role }) {
  const instructions = await safeList('SystemInstruction', 'sort_order', 200);
  return instructions.filter((instruction) => {
    if (!instruction.is_active) return false;
    const pageMatch = !instruction.target_page || instruction.target_page === pageKey || instruction.target_page === 'all';
    const roleMatch = !instruction.target_role || instruction.target_role === role || instruction.target_role === 'all';
    return pageMatch && roleMatch;
  });
}
