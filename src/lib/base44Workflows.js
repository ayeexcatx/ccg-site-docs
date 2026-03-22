import { base44 } from '@/api/base44Client';
import { getFieldSessionSummary, getProjectReadinessSummary, orderCheckpoints } from '@/lib/domainWorkflows';

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
  const orderedCheckpoints = orderCheckpoints(checkpoints);
  await Promise.all(
    orderedCheckpoints.map((checkpoint, index) =>
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
  return getFieldSessionSummary({ checkpoints, events }).estimatedTimeline;
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
  return getProjectReadinessSummary({ project, segments, sessions, media, markers, routes });
}

export async function getRoleAwareDashboardData({ role, profile }) {
  const [projects, sessions, mediaFiles, reviewCases, clients, markers] = await Promise.all([
    safeList('Project', '-created_date', 50),
    safeList('CaptureSession', '-created_date', 50),
    safeList('MediaFile', '-created_date', 100),
    safeList('ReviewCase', '-created_date', 50),
    safeList('ClientOrganization', '-created_date', 50),
    safeList('MediaMarker', '-created_date', 100),
  ]);

  if (['client_manager', 'client_viewer'].includes(role)) {
    const scopedProjects = projects.filter((project) => project.published_to_client && (!profile?.client_organization_id || project.client_organization_id === profile.client_organization_id));
    const scopedReviewCases = reviewCases.filter((item) => item.client_organization_id && item.client_organization_id === profile?.client_organization_id);
    return {
      projects: scopedProjects,
      sessions: [],
      mediaFiles: mediaFiles.filter((file) => scopedProjects.some((project) => project.id === file.project_id) && file.publish_to_client),
      reviewCases: scopedReviewCases,
      clients: clients.filter((client) => client.id === profile?.client_organization_id),
      markers: markers.filter((marker) => marker.is_client_visible && scopedProjects.some((project) => project.id === marker.project_id)),
    };
  }

  if (role === 'documenter') {
    const scopedSessions = sessions.filter((session) => session.assigned_documenter_id === profile?.id);
    const projectIds = new Set(scopedSessions.map((session) => session.project_id));
    return {
      projects: projects.filter((project) => projectIds.has(project.id)),
      sessions: scopedSessions,
      mediaFiles: mediaFiles.filter((file) => projectIds.has(file.project_id)),
      reviewCases: reviewCases.filter((item) => projectIds.has(item.project_id)),
      clients: clients,
      markers: markers.filter((marker) => projectIds.has(marker.project_id)),
    };
  }

  return { projects, sessions, mediaFiles, reviewCases, clients, markers };
}

export async function loadSystemInstructionsForPage({ pageKey, role }) {
  const instructions = await safeList('SystemInstruction', 'sort_order', 200);
  return instructions.filter((instruction) => {
    if (!instruction.is_active) return false;
    const pageMatch = !instruction.target_page || instruction.target_page === pageKey || instruction.target_page === 'all';
    let roleMatch = false;
    try {
      const targetRoles = instruction.target_role_json ? JSON.parse(instruction.target_role_json) : [];
      roleMatch = !instruction.target_role_json || targetRoles.length === 0 || targetRoles.includes(role) || targetRoles.includes('all');
    } catch {
      roleMatch = !instruction.target_role_json;
    }
    return pageMatch && roleMatch;
  });
}