import { formatLabel, formatTimestamp } from '@/lib/displayUtils';

const INTERNAL_DRAFT_PATTERN = /todo|tbd|draft|internal/i;
const CHECKPOINT_EVENT_TYPES = ['intersection', 'landmark', 'curb_ramp'];
const SESSION_LIFECYCLE_EVENT_TYPES = ['session_start', 'session_pause', 'session_resume', 'session_end'];
const SESSION_NOTE_EVENT_TYPES = ['issue_note'];

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildEntityMap(records = []) {
  return Object.fromEntries(toArray(records).map((record) => [record.id, record]));
}

export function getVisibilityLabelForRecord(record = {}, clientField = 'client_visible_notes', internalField = 'internal_notes', visibleFlag = 'is_client_visible') {
  // Visibility is intentionally derived from the same Base44 fields pages already use.
  // Keeping this in one helper prevents subtle page-level disagreements.
  if (record?.[visibleFlag]) return 'client_visible';
  if (record?.[clientField] && !record?.[visibleFlag]) return 'needs_review';
  if (record?.[internalField]) return 'internal_only';
  return 'needs_review';
}

export function getMarkerConfidenceLabel(confidenceLevel) {
  // A readable label makes review screens easier to scan and gives future workflow code
  // a single place to define marker confidence vocabulary.
  const normalized = confidenceLevel || 'unknown';
  return {
    manual: 'Manual',
    estimated: 'Estimated',
    confirmed: 'Confirmed',
    ai_suggested_future: 'AI Suggested (Future)',
    unknown: 'Unknown confidence',
  }[normalized] || formatLabel(normalized);
}

export function orderCheckpoints(checkpoints = []) {
  // Checkpoints can be partially saved, template-seeded, or freshly reordered in memory.
  // We sort first by explicit sequence order, then by original array order as a safe fallback.
  return toArray(checkpoints)
    .map((checkpoint, index) => ({ ...checkpoint, __originalIndex: index }))
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.sequence_order) ? left.sequence_order : left.__originalIndex;
      const rightOrder = Number.isFinite(right.sequence_order) ? right.sequence_order : right.__originalIndex;
      return leftOrder - rightOrder;
    })
    .map(({ __originalIndex, ...checkpoint }, index) => ({ ...checkpoint, sequence_order: index }));
}

export function getRoutePathSummary(routePoints = [], checkpoints = []) {
  const orderedCheckpoints = orderCheckpoints(checkpoints);
  const startCheckpoint = orderedCheckpoints.find((checkpoint) => checkpoint.checkpoint_type === 'start');
  const endCheckpoint = orderedCheckpoints.find((checkpoint) => checkpoint.checkpoint_type === 'end');
  const hasRequiredAnchors = Boolean(startCheckpoint && endCheckpoint);

  return {
    pointCount: toArray(routePoints).length,
    checkpointCount: orderedCheckpoints.length,
    orderedCheckpoints,
    startLabel: startCheckpoint?.checkpoint_label || 'Missing start',
    endLabel: endCheckpoint?.checkpoint_label || 'Missing end',
    completenessLabel: routePoints.length >= 2 && hasRequiredAnchors ? 'Operationally complete' : 'Needs review',
    hasRequiredAnchors,
  };
}

export function getSegmentCoverageSummary({ segments = [], routes = [], sessions = [], media = [] }) {
  const segmentList = toArray(segments);
  const segmentIds = new Set(segmentList.map((segment) => segment.id));
  const routeCoveredSegmentIds = new Set(toArray(routes).map((route) => route.street_segment_id).filter((id) => segmentIds.has(id)));
  const sessionCoveredSegmentIds = new Set(toArray(sessions).map((session) => session.street_segment_id).filter((id) => segmentIds.has(id)));
  const mediaCoveredSegmentIds = new Set(toArray(media).map((item) => item.street_segment_id).filter((id) => segmentIds.has(id)));
  const totalSegments = segmentList.length;
  const toPercent = (covered) => (totalSegments ? Math.min(100, Math.round((covered / totalSegments) * 100)) : 0);

  return {
    totalSegments,
    routedSegments: routeCoveredSegmentIds.size,
    sessionCoveredSegments: sessionCoveredSegmentIds.size,
    mediaCoveredSegments: mediaCoveredSegmentIds.size,
    routeCompleteness: toPercent(routeCoveredSegmentIds.size),
    sessionCompleteness: toPercent(sessionCoveredSegmentIds.size),
    mediaCompleteness: toPercent(mediaCoveredSegmentIds.size),
  };
}

export function getProjectReadinessSummary({ project, segments = [], sessions = [], media = [], markers = [], routes = [] }) {
  // This helper intentionally mirrors the existing Base44-driven workflow rules so refactors
  // stay behavior-compatible while making the publish logic easier to read.
  const coverage = getSegmentCoverageSummary({ segments, routes, sessions, media });
  const requiredViewTypes = [
    project?.include_photos && 'profile',
    project?.include_standard_video && 'cross_section',
    project?.include_360_video && '360_walk',
  ].filter(Boolean);
  const viewTypesPresent = requiredViewTypes.filter((type) => toArray(media).some((item) => item.view_type === type));
  const uploadedSessions = toArray(sessions).filter((session) => ['uploaded', 'under_review', 'approved', 'published'].includes(session.session_status));
  const completeSessions = toArray(sessions).filter((session) => ['approved', 'published'].includes(session.session_status));
  const mediaAttached = toArray(media).filter((item) => !!item.file_url || !!item.thumbnail_url);
  const reviewedMarkers = toArray(markers).filter((marker) => marker.confidence_level === 'confirmed');
  const clientSafeMarkers = toArray(markers).filter((marker) => getVisibilityLabelForRecord(marker) === 'client_visible');
  const notesValidated = !project?.client_visible_notes || !INTERNAL_DRAFT_PATTERN.test(project.client_visible_notes);

  const checklist = [
    { key: 'segments', label: 'Required segments present', ready: segments.length > 0, reason: segments.length ? `${segments.length} scoped segments loaded.` : 'Add at least one segment before publishing.' },
    { key: 'view_types', label: 'Required view types present', ready: requiredViewTypes.every((type) => viewTypesPresent.includes(type)), reason: requiredViewTypes.length ? `${viewTypesPresent.length}/${requiredViewTypes.length} required view types are covered.` : 'Project view requirements are not yet defined.' },
    { key: 'sessions', label: 'Sessions complete', ready: sessions.length > 0 && completeSessions.length === sessions.length, reason: sessions.length ? `${completeSessions.length}/${sessions.length} sessions are approved or published.` : 'Create and complete at least one capture session.' },
    { key: 'media', label: 'Media attached', ready: mediaAttached.length > 0, reason: mediaAttached.length ? `${mediaAttached.length} media records have client-deliverable files or thumbnails.` : 'Attach media assets before publishing.' },
    { key: 'markers', label: 'Markers reviewed', ready: markers.length > 0 && reviewedMarkers.length === markers.length, reason: markers.length ? `${reviewedMarkers.length}/${markers.length} markers are confirmed.` : 'Add and review markers before publishing.' },
    { key: 'notes', label: 'Client-visible notes validated', ready: notesValidated && clientSafeMarkers.length >= 0, reason: notesValidated ? 'Client-facing notes do not include draft/internal language.' : 'Client-visible notes contain draft/internal wording that must be cleaned up.' },
  ];

  return {
    routeCompleteness: coverage.routeCompleteness,
    sessionCompleteness: coverage.sessionCompleteness,
    uploadReadiness: uploadedSessions.length === sessions.length && sessions.length > 0,
    reviewReadiness: reviewedMarkers.length >= Math.max(1, Math.floor(markers.length * 0.6 || 1)),
    publishReadiness: checklist.every((check) => check.ready),
    checklist,
    blockers: checklist.filter((check) => !check.ready).map((check) => `${check.label}: ${check.reason}`),
    summary: {
      requiredViewTypes,
      viewTypesPresent,
      completeSessions: completeSessions.length,
      totalSessions: sessions.length,
      reviewedMarkers: reviewedMarkers.length,
      totalMarkers: markers.length,
      mediaAttached: mediaAttached.length,
      clientSafeMarkers: clientSafeMarkers.length,
      coverage,
    },
  };
}

export function getFieldSessionSummary(params = {}) {
  const { checkpoints = [], events = [], finalElapsedSeconds } = params;
  const orderedEvents = toArray(events).slice().sort((left, right) => (left.timestamp_offset_seconds || 0) - (right.timestamp_offset_seconds || 0));
  const groupedEvents = {
    lifecycle: orderedEvents.filter((event) => SESSION_LIFECYCLE_EVENT_TYPES.includes(event.event_type)),
    checkpoints: orderedEvents.filter((event) => CHECKPOINT_EVENT_TYPES.includes(event.event_type)),
    notes: orderedEvents.filter((event) => SESSION_NOTE_EVENT_TYPES.includes(event.event_type)),
  };

  const estimatedTimeline = orderCheckpoints(checkpoints).map((checkpoint, index) => {
    const event = orderedEvents[index] || orderedEvents[orderedEvents.length - 1] || null;
    return {
      checkpoint_id: checkpoint.id,
      checkpoint_label: checkpoint.checkpoint_label,
      estimated_timestamp_seconds: event?.timestamp_offset_seconds ?? null,
      source_event_type: event?.event_type || null,
    };
  });

  const effectiveDuration = finalElapsedSeconds ?? orderedEvents[orderedEvents.length - 1]?.timestamp_offset_seconds ?? 0;

  return {
    orderedEvents,
    groupedEvents,
    estimatedTimeline,
    totalDuration: effectiveDuration,
    totalEvents: orderedEvents.length,
    summaryLine: `${orderedEvents.length} events over ${formatTimestamp(effectiveDuration)}`,
  };
}

export function getMarkerReviewSummary(params = {}) {
  const { markers = [], mediaFiles = [], projects = [], sessions = [], checkpoints = [], assetLocations = [], filters = {} } = params;
  const mediaMap = buildEntityMap(mediaFiles);
  const projectMap = buildEntityMap(projects);
  const sessionMap = buildEntityMap(sessions);
  const checkpointMap = buildEntityMap(checkpoints);
  const assetMap = buildEntityMap(assetLocations);

  const filterDefinitions = [
    { key: 'projectId', getValue: (marker) => marker.project_id },
    { key: 'sessionId', getValue: (marker) => mediaMap[marker.media_file_id]?.capture_session_id || 'unknown' },
    { key: 'mediaId', getValue: (marker) => marker.media_file_id },
    { key: 'confidence', getValue: (marker) => marker.confidence_level },
    { key: 'visibility', getValue: (marker) => getVisibilityLabelForRecord(marker) },
  ];

  const filteredMarkers = toArray(markers).filter((marker) => {
    const media = mediaMap[marker.media_file_id];
    const searchText = `${marker.marker_label} ${media?.media_title || ''}`.toLowerCase();
    const matchesStructuredFilters = filterDefinitions.every(({ key, getValue }) => !filters[key] || filters[key] === 'all' || getValue(marker) === filters[key]);
    return matchesStructuredFilters && searchText.includes((filters.search || '').toLowerCase());
  });

  const groupedByMedia = filteredMarkers.reduce((accumulator, marker) => {
    const media = mediaMap[marker.media_file_id] || { id: 'unassigned', media_title: 'Unassigned media' };
    accumulator[media.id] ||= { media, markers: [] };
    accumulator[media.id].markers.push(marker);
    return accumulator;
  }, {});

  return {
    filterDefinitions,
    filteredMarkers,
    groupedByMedia,
    mediaMap,
    projectMap,
    sessionMap,
    checkpointMap,
    assetMap,
    confidenceCounts: filteredMarkers.reduce((accumulator, marker) => {
      const key = marker.confidence_level || 'unknown';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {}),
  };
}

export function groupMediaBySegmentViewSession(mediaFiles = []) {
  // We group by segment, then view, then session because that mirrors how documentation
  // work is planned, captured, and eventually reviewed by clients.
  return toArray(mediaFiles).reduce((segmentAccumulator, item) => {
    const segmentKey = item.street_segment_id || 'unassigned';
    const viewKey = item.view_type || 'unknown_view';
    const sessionKey = item.capture_session_id || 'unassigned';

    segmentAccumulator[segmentKey] ||= {};
    segmentAccumulator[segmentKey][viewKey] ||= {};
    segmentAccumulator[segmentKey][viewKey][sessionKey] ||= [];
    segmentAccumulator[segmentKey][viewKey][sessionKey].push(item);
    return segmentAccumulator;
  }, {});
}

export function getClientVisibleProjectData({ project, segments = [], media = [], markers = [] }) {
  // Client viewers should only receive fields that are approved for portal use.
  // This helper centralizes that rule so portal pages do not handcraft visibility checks.
  const publishedMedia = toArray(media)
    .filter((item) => item.publish_to_client)
    .map((item) => ({
      ...item,
      internal_notes: undefined,
    }));
  const clientVisibleMarkers = toArray(markers)
    .filter((marker) => getVisibilityLabelForRecord(marker) === 'client_visible')
    .filter((marker) => publishedMedia.some((item) => item.id === marker.media_file_id))
    .map((marker) => ({
      ...marker,
      internal_notes: undefined,
    }));
  const clientVisibleSegments = toArray(segments)
    .filter((segment) => getVisibilityLabelForRecord(segment) !== 'internal_only')
    .map((segment) => ({
      ...segment,
      internal_notes: undefined,
    }));

  return {
    project: project ? { ...project, internal_notes: undefined } : null,
    segments: clientVisibleSegments,
    media: publishedMedia,
    markers: clientVisibleMarkers,
    groupedMedia: groupMediaBySegmentViewSession(publishedMedia),
  };
}
