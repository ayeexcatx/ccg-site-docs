import { formatLabel, formatTimestamp } from '@/lib/displayUtils';

const INTERNAL_DRAFT_PATTERN = /todo|tbd|draft|internal/i;
const CHECKPOINT_EVENT_TYPES = ['intersection', 'landmark', 'curb_ramp'];
const SESSION_LIFECYCLE_EVENT_TYPES = ['session_start', 'session_pause', 'session_resume', 'session_end'];
const SESSION_NOTE_EVENT_TYPES = ['issue_note'];
const CLIENT_NOTE_VALIDATION_PATTERN = /todo|tbd|draft|internal|fixme|placeholder|for qa|needs review/i;

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildEntityMap(records = []) {
  return Object.fromEntries(toArray(records).map((record) => [record.id, record]));
}

function toSearchText(...parts) {
  return parts
    .flatMap((part) => (Array.isArray(part) ? part : [part]))
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function asJsonArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function haversineDistanceMeters(start, end) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRadians((end?.lat || 0) - (start?.lat || 0));
  const dLng = toRadians((end?.lng || 0) - (start?.lng || 0));
  const lat1 = toRadians(start?.lat || 0);
  const lat2 = toRadians(end?.lat || 0);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function normalizePoint(point = {}) {
  const lat = Number(point.lat ?? point.map_latitude ?? point.latitude);
  const lng = Number(point.lng ?? point.map_longitude ?? point.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function parseIsoTime(value) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function isApprovedSession(session = {}) {
  return ['approved', 'published'].includes(session.session_status) || session.qa_status === 'approved';
}

function isSessionUploaded(session = {}) {
  return ['uploaded', 'under_review', 'approved', 'published'].includes(session.session_status);
}

function isMediaPublishSafe(item = {}) {
  const readinessOkay = ['ready_for_publish', 'published'].includes(item.publish_readiness);
  const processingOkay = ['ready', 'archived'].includes(item.processing_status) || !item.processing_status;
  const hasClientFile = Boolean(item.preview_url || item.file_url);
  const needsPreview = ['video', 'video_360', 'preview_clip'].includes(item.media_type);
  const needsThumbnail = item.media_type !== 'document';
  const previewOkay = !needsPreview || item.preview_status === 'ready' || !!item.preview_url;
  const thumbnailOkay = !needsThumbnail || item.thumbnail_status === 'ready' || !!item.thumbnail_url;
  return readinessOkay && processingOkay && hasClientFile && previewOkay && thumbnailOkay;
}

function normalizeIssue(key, label, status, reason, severity = status === 'blocked' ? 'blocker' : 'warning') {
  return { key, label, status, reason, severity, ready: status === 'ready' };
}

export function getVisibilityLabelForRecord(record = {}, clientField = 'client_visible_notes', internalField = 'internal_notes', visibleFlag = 'is_client_visible') {
  if (record?.[visibleFlag]) return 'client_visible';
  if (record?.[clientField] && !record?.[visibleFlag]) return 'needs_review';
  if (record?.[internalField]) return 'internal_only';
  return 'needs_review';
}

export function getVisibilityWarnings(record = {}, { clientField = 'client_visible_notes', internalField = 'internal_notes', visibleFlag = 'is_client_visible' } = {}) {
  const warnings = [];
  const clientText = record?.[clientField]?.trim?.() || '';
  const internalText = record?.[internalField]?.trim?.() || '';
  const isVisible = !!record?.[visibleFlag];

  if (isVisible && !clientText) warnings.push('Client-visible content should include a client-facing note before publication or portal review.');
  if (clientText && INTERNAL_DRAFT_PATTERN.test(clientText)) warnings.push('Client-visible notes contain draft or internal wording that should be cleaned before publication.');
  if (isVisible && internalText && clientText && internalText.trim() === clientText.trim()) warnings.push('Client-visible notes currently mirror internal notes. Rewrite the client text so internal-only language is not exposed.');

  return warnings;
}

export function getMarkerConfidenceLabel(confidenceLevel) {
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

export function ensureRouteCheckpointDefaults(routePoints = [], checkpoints = []) {
  const normalizedRoutePoints = toArray(routePoints).map(normalizePoint).filter(Boolean);
  const ordered = orderCheckpoints(checkpoints);
  const firstPoint = normalizedRoutePoints[0] || null;
  const lastPoint = normalizedRoutePoints[normalizedRoutePoints.length - 1] || null;
  const manualMiddleCheckpoints = ordered.filter((checkpoint) => checkpoint.checkpoint_type !== 'start' && checkpoint.checkpoint_type !== 'end');
  const startCheckpoint = ordered.find((checkpoint) => checkpoint.checkpoint_type === 'start');
  const endCheckpoint = [...ordered].reverse().find((checkpoint) => checkpoint.checkpoint_type === 'end');
  const anchored = [];

  if (firstPoint) {
    anchored.push({
      ...startCheckpoint,
      checkpoint_type: 'start',
      checkpoint_label: startCheckpoint?.checkpoint_label?.trim() || 'Start',
      map_latitude: firstPoint.lat,
      map_longitude: firstPoint.lng,
      is_client_visible: startCheckpoint?.is_client_visible ?? true,
      is_route_endpoint_default: true,
    });
  }

  anchored.push(...manualMiddleCheckpoints.map((checkpoint) => ({ ...checkpoint, is_route_endpoint_default: false })));

  if (lastPoint) {
    anchored.push({
      ...endCheckpoint,
      checkpoint_type: 'end',
      checkpoint_label: endCheckpoint?.checkpoint_label?.trim() || 'End',
      map_latitude: lastPoint.lat,
      map_longitude: lastPoint.lng,
      is_client_visible: endCheckpoint?.is_client_visible ?? true,
      is_route_endpoint_default: true,
    });
  }

  return orderCheckpoints(anchored);
}

export function getRouteValidationWarnings({ projectId, segmentId, sessionId, routeName, routePoints = [], checkpoints = [] }) {
  const normalizedCheckpoints = ensureRouteCheckpointDefaults(routePoints, checkpoints);
  const routeSummary = getRoutePathSummary(routePoints, normalizedCheckpoints);
  const warnings = [];

  if (!projectId) warnings.push('Choose a project before building or saving a route.');
  if (!segmentId) warnings.push('Choose a segment so the route is attached to the correct geography.');
  if (!sessionId) warnings.push('Choose a capture session so field timing and review tools can reuse this route.');
  if (!routeName?.trim()) warnings.push('Add a route name so reviewers can identify the operational path quickly.');
  if (routePoints.length < 2) warnings.push('Add at least two map points to create a usable route path.');
  if (!routeSummary.hasRequiredAnchors) warnings.push('The first and last route points must be available so the system can assign Start and End checkpoints automatically.');
  if (toArray(normalizedCheckpoints).some((checkpoint) => !checkpoint.checkpoint_label?.trim())) warnings.push('Rename any blank checkpoint labels so field and QA users can interpret them.');

  return warnings;
}

export function estimateRouteProgressFromGps({ routePoints = [], sample = null }) {
  const normalizedRoute = toArray(routePoints).map(normalizePoint).filter(Boolean);
  const normalizedSample = normalizePoint(sample);
  if (normalizedRoute.length === 0 || !normalizedSample) {
    return { nearestPointIndex: -1, progressPercent: 0, distanceMeters: null };
  }

  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  normalizedRoute.forEach((point, index) => {
    const distance = haversineDistanceMeters(point, normalizedSample);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return {
    nearestPointIndex: bestIndex,
    progressPercent: normalizedRoute.length > 1 ? Math.round((bestIndex / (normalizedRoute.length - 1)) * 100) : 0,
    distanceMeters: Math.round(bestDistance),
  };
}

export function estimateCheckpointMatchesFromGps({ checkpoints = [], gpsSamples = [], routePoints = [] }) {
  const orderedCheckpoints = orderCheckpoints(checkpoints).filter((checkpoint) => normalizePoint(checkpoint));
  const normalizedSamples = toArray(gpsSamples)
    .map((sample) => {
      const point = normalizePoint(sample);
      if (!point) return null;
      return {
        ...sample,
        lat: point.lat,
        lng: point.lng,
        timestamp: sample.timestamp || sample.recorded_at || sample.sampled_at || null,
      };
    })
    .filter(Boolean);

  return orderedCheckpoints.map((checkpoint, index) => {
    const checkpointPoint = normalizePoint(checkpoint);
    let bestSample = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    normalizedSamples.forEach((sample) => {
      const distance = haversineDistanceMeters(checkpointPoint, sample);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestSample = sample;
      }
    });

    const progress = estimateRouteProgressFromGps({ routePoints, sample: bestSample });
    return {
      checkpoint_id: checkpoint.id || `checkpoint-${index}`,
      checkpoint_label: checkpoint.checkpoint_label || `Checkpoint ${index + 1}`,
      checkpoint_type: checkpoint.checkpoint_type || 'custom',
      estimated_timestamp: bestSample?.timestamp || null,
      nearest_landmark: checkpoint.checkpoint_label || checkpoint.checkpoint_reference || null,
      progress_percent: progress.progressPercent,
      distance_from_checkpoint_meters: Number.isFinite(bestDistance) ? Math.round(bestDistance) : null,
      confidence: bestSample && bestDistance <= 35 ? 'high' : bestSample && bestDistance <= 80 ? 'medium' : bestSample ? 'low' : 'none',
      gps_sample: bestSample ? {
        field_session_reference: bestSample.field_session_reference || bestSample.capture_session_id || '',
        timestamp: bestSample.timestamp,
        latitude: bestSample.lat,
        longitude: bestSample.lng,
        accuracy: bestSample.accuracy ?? null,
        heading: bestSample.heading ?? null,
        speed: bestSample.speed ?? null,
      } : null,
    };
  });
}

export function estimateSuggestedCutPoints({ segments = [], checkpoints = [], gpsSamples = [], routePoints = [] }) {
  const matches = estimateCheckpointMatchesFromGps({ checkpoints, gpsSamples, routePoints });
  const orderedSegments = toArray(segments);

  if (!orderedSegments.length) {
    const first = matches[0] || null;
    const last = matches[matches.length - 1] || null;
    return [{
      segment_id: null,
      segment_label: 'Full session',
      suggested_start_timestamp: first?.estimated_timestamp || null,
      suggested_end_timestamp: last?.estimated_timestamp || null,
      start_checkpoint_label: first?.checkpoint_label || 'Start',
      end_checkpoint_label: last?.checkpoint_label || 'End',
      confidence: first?.confidence === 'high' && last?.confidence === 'high' ? 'high' : first || last ? 'medium' : 'none',
    }];
  }

  return orderedSegments.map((segment, index) => {
    const startMatch = matches[index] || matches[0] || null;
    const endMatch = matches[index + 1] || matches[matches.length - 1] || startMatch;
    return {
      segment_id: segment.id || `segment-${index}`,
      segment_label: segment.segment_code || segment.street_name || `Segment ${index + 1}`,
      suggested_start_timestamp: startMatch?.estimated_timestamp || null,
      suggested_end_timestamp: endMatch?.estimated_timestamp || null,
      start_checkpoint_label: startMatch?.checkpoint_label || 'Start',
      end_checkpoint_label: endMatch?.checkpoint_label || 'End',
      confidence: startMatch?.confidence === 'high' && endMatch?.confidence === 'high' ? 'high' : startMatch || endMatch ? 'medium' : 'none',
    };
  });
}

export function buildGpsSampleRecord({ fieldSessionReference, coords = {}, timestamp = new Date().toISOString() }) {
  return {
    field_session_reference: fieldSessionReference || '',
    timestamp,
    latitude: Number(coords.latitude ?? coords.lat ?? 0),
    longitude: Number(coords.longitude ?? coords.lng ?? 0),
    accuracy: coords.accuracy ?? null,
    heading: coords.heading ?? null,
    speed: coords.speed ?? null,
  };
}

export function getGpsTrackingSessionSummary({ sessionId, gpsSamples = [], checkpoints = [], routePoints = [], segments = [] }) {
  const normalizedSamples = toArray(gpsSamples).filter((sample) => Number.isFinite(Number(sample.latitude ?? sample.lat)) && Number.isFinite(Number(sample.longitude ?? sample.lng)));
  const firstSampleTime = parseIsoTime(normalizedSamples[0]?.timestamp);
  const lastSampleTime = parseIsoTime(normalizedSamples[normalizedSamples.length - 1]?.timestamp);
  const checkpointMatches = estimateCheckpointMatchesFromGps({ checkpoints, gpsSamples: normalizedSamples, routePoints });
  const suggestedCutPoints = estimateSuggestedCutPoints({ segments, checkpoints, gpsSamples: normalizedSamples, routePoints });
  const lastProgress = estimateRouteProgressFromGps({ routePoints, sample: normalizedSamples[normalizedSamples.length - 1] });

  return {
    totalSamples: normalizedSamples.length,
    firstSampleTimestamp: normalizedSamples[0]?.timestamp || null,
    lastSampleTimestamp: normalizedSamples[normalizedSamples.length - 1]?.timestamp || null,
    elapsedSeconds: firstSampleTime !== null && lastSampleTime !== null ? Math.max(0, Math.round((lastSampleTime - firstSampleTime) / 1000)) : 0,
    checkpointMatches,
    suggestedCutPoints,
    lastKnownProgress: lastProgress,
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
  const coverage = getSegmentCoverageSummary({ segments, routes, sessions, media });
  const projectRequiredViews = [
    project?.include_photos && 'profile',
    project?.include_standard_video && 'cross_section',
    project?.include_360_video && '360_walk',
  ].filter(Boolean);
  const segmentExpectedViews = [...new Set(toArray(segments).flatMap((segment) => asJsonArray(segment.expected_views_json)))];
  const requiredViewTypes = [...new Set([...projectRequiredViews, ...segmentExpectedViews])];
  const uploadedSessions = toArray(sessions).filter(isSessionUploaded);
  const completeSessions = toArray(sessions).filter(isApprovedSession);
  const mediaAttached = toArray(media).filter((item) => !!item.file_url || !!item.preview_url || !!item.thumbnail_url);
  const reviewedMarkers = toArray(markers).filter((marker) => marker.confidence_level === 'confirmed');
  const clientSafeMarkers = toArray(markers).filter((marker) => getVisibilityLabelForRecord(marker) === 'client_visible');
  const mediaBySegment = toArray(media).reduce((accumulator, item) => {
    const key = item.street_segment_id || 'unassigned';
    accumulator[key] ||= [];
    accumulator[key].push(item);
    return accumulator;
  }, {});
  const routesBySegment = toArray(routes).reduce((accumulator, item) => {
    const key = item.street_segment_id || 'unassigned';
    accumulator[key] ||= [];
    accumulator[key].push(item);
    return accumulator;
  }, {});
  const sessionsBySegment = toArray(sessions).reduce((accumulator, item) => {
    const key = item.street_segment_id || 'unassigned';
    accumulator[key] ||= [];
    accumulator[key].push(item);
    return accumulator;
  }, {});
  const publishedMedia = toArray(media).filter((item) => item.publish_to_client);
  const publishSafeMedia = publishedMedia.filter(isMediaPublishSafe);
  const unsafePublishedMedia = publishedMedia.filter((item) => !isMediaPublishSafe(item));
  const notesValidated = !project?.client_visible_notes || !CLIENT_NOTE_VALIDATION_PATTERN.test(project.client_visible_notes);
  const segmentNotesNeedingReview = toArray(segments).filter((segment) => {
    const note = segment.client_visible_notes?.trim?.();
    return note && CLIENT_NOTE_VALIDATION_PATTERN.test(note);
  });
  const mediaNotesNeedingReview = toArray(media).filter((item) => {
    const note = item.client_visible_notes?.trim?.();
    return note && CLIENT_NOTE_VALIDATION_PATTERN.test(note);
  });
  const markerNotesNeedingReview = toArray(markers).filter((marker) => {
    const note = marker.client_visible_notes?.trim?.();
    return note && CLIENT_NOTE_VALIDATION_PATTERN.test(note);
  });
  const unreviewedVisibleMarkers = clientSafeMarkers.filter((marker) => marker.confidence_level !== 'confirmed');
  const segmentsMissingRoutes = toArray(segments).filter((segment) => !toArray(routesBySegment[segment.id]).length);
  const segmentsMissingSessions = toArray(segments).filter((segment) => !toArray(sessionsBySegment[segment.id]).length);
  const segmentsMissingMedia = toArray(segments).filter((segment) => !toArray(mediaBySegment[segment.id]).length);
  const segmentsMissingRequiredViews = toArray(segments).filter((segment) => {
    const expectedViews = [...new Set([...projectRequiredViews, ...asJsonArray(segment.expected_views_json)])];
    if (!expectedViews.length) return false;
    const segmentViews = new Set(toArray(mediaBySegment[segment.id]).map((item) => item.view_type).filter(Boolean));
    return expectedViews.some((viewType) => !segmentViews.has(viewType));
  });

  const issues = [
    normalizeIssue('draft_data', 'Draft data still driving the package', project?.project_status === 'draft' || project?.documentation_status === 'not_started'
      ? 'blocked'
      : project?.documentation_status === 'reviewed' || project?.documentation_status === 'published'
        ? 'ready'
        : 'warning', project?.project_status === 'draft' || project?.documentation_status === 'not_started'
      ? 'The project is still marked as draft/not started, so the package should remain internal only.'
      : project?.documentation_status === 'reviewed' || project?.documentation_status === 'published'
        ? 'The project record shows a reviewed documentation state rather than a draft-only state.'
        : 'The project is in active production. Keep publication expectations internal until internal review is complete.'),
    normalizeIssue('required_views', 'Required views are complete', requiredViewTypes.length === 0
      ? 'blocked'
      : segmentsMissingRequiredViews.length === 0 && requiredViewTypes.every((type) => toArray(media).some((item) => item.view_type === type))
        ? 'ready'
        : 'blocked', requiredViewTypes.length === 0
      ? 'No required views are defined yet. Set expected views at the project or segment level before publishing.'
      : segmentsMissingRequiredViews.length === 0
        ? `${requiredViewTypes.length} required view types are represented across the project.`
        : `${segmentsMissingRequiredViews.length} segments are still missing one or more required view types.`),
    normalizeIssue('sessions', 'Sessions exist for scoped segments', segments.length > 0 && segmentsMissingSessions.length === 0 && sessions.length > 0 ? 'ready' : 'blocked', segments.length === 0
      ? 'Add scoped segments first so session coverage can be evaluated.'
      : !sessions.length
        ? 'No capture sessions exist yet for this project.'
        : `${segmentsMissingSessions.length} segments are still missing capture sessions.`),
    normalizeIssue('route_data', 'Route data covers the scoped segments', segments.length > 0 && segmentsMissingRoutes.length === 0 && routes.length > 0 ? 'ready' : 'blocked', segments.length === 0
      ? 'Add scoped segments first so route completeness can be evaluated.'
      : !routes.length
        ? 'No route paths exist yet for this project.'
        : `${segmentsMissingRoutes.length} segments are still missing route path data.`),
    normalizeIssue('reviewed_markers', 'Reviewed markers support client context', markers.length > 0 && unreviewedVisibleMarkers.length === 0 && reviewedMarkers.length > 0 ? 'ready' : markers.length === 0 ? 'warning' : 'blocked', markers.length === 0
      ? 'No markers exist yet. The package can still move internally, but client guidance will be weaker until reviewed markers are added.'
      : unreviewedVisibleMarkers.length === 0
        ? `${reviewedMarkers.length}/${markers.length} markers are confirmed and all client-visible markers are reviewed.`
        : `${unreviewedVisibleMarkers.length} client-visible markers are still not confirmed.`),
    normalizeIssue('client_notes', 'Client-visible notes are validated', notesValidated && !segmentNotesNeedingReview.length && !mediaNotesNeedingReview.length && !markerNotesNeedingReview.length ? 'ready' : 'blocked', notesValidated && !segmentNotesNeedingReview.length && !mediaNotesNeedingReview.length && !markerNotesNeedingReview.length
      ? 'Client-facing summaries and notes do not contain draft/internal wording.'
      : 'Some project, segment, media, or marker client-visible notes still contain draft/internal phrasing.'),
    normalizeIssue('media_publish_safe', 'Media is marked safe for publish', unsafePublishedMedia.length === 0 && publishSafeMedia.length === publishedMedia.length ? publishedMedia.length ? 'ready' : 'warning' : 'blocked', !publishedMedia.length
      ? 'No media is currently selected for client publishing yet.'
      : unsafePublishedMedia.length === 0
        ? `${publishSafeMedia.length} published media records have safe preview/thumbnail/readiness coverage.`
        : `${unsafePublishedMedia.length} media records are selected for client publishing without full publish-safe readiness.`),
    normalizeIssue('media_attached', 'Media coverage exists for scoped segments', segments.length > 0 && mediaAttached.length > 0 && segmentsMissingMedia.length === 0 ? 'ready' : 'blocked', !mediaAttached.length
      ? 'Attach media files or preview-safe derivatives before publishing.'
      : `${segmentsMissingMedia.length} segments still have no media coverage attached.`),
  ];

  const blockers = issues.filter((issue) => issue.status === 'blocked').map((issue) => `${issue.label}: ${issue.reason}`);
  const warnings = issues.filter((issue) => issue.status === 'warning').map((issue) => `${issue.label}: ${issue.reason}`);
  const internalReviewReady = blockers.length === 0;
  const publishReadiness = internalReviewReady && unsafePublishedMedia.length === 0 && notesValidated;
  const publishPhase = project?.published_to_client ? 'client_published' : internalReviewReady ? 'internally_reviewed' : 'draft_data';

  return {
    routeCompleteness: coverage.routeCompleteness,
    sessionCompleteness: coverage.sessionCompleteness,
    uploadReadiness: uploadedSessions.length === sessions.length && sessions.length > 0,
    reviewReadiness: internalReviewReady,
    publishReadiness,
    publishPhase,
    checklist: issues,
    blockers,
    warnings,
    summary: {
      requiredViewTypes,
      viewTypesPresent: [...new Set(toArray(media).map((item) => item.view_type).filter(Boolean))],
      completeSessions: completeSessions.length,
      totalSessions: sessions.length,
      reviewedMarkers: reviewedMarkers.length,
      totalMarkers: markers.length,
      mediaAttached: mediaAttached.length,
      clientSafeMarkers: clientSafeMarkers.length,
      publishedMedia: publishedMedia.length,
      publishSafeMedia: publishSafeMedia.length,
      unsafePublishedMedia: unsafePublishedMedia.length,
      segmentsMissingRoutes: segmentsMissingRoutes.length,
      segmentsMissingSessions: segmentsMissingSessions.length,
      segmentsMissingRequiredViews: segmentsMissingRequiredViews.length,
      coverage,
    },
  };
}

export function getProjectPublishWarnings({ project, segments = [], sessions = [], media = [], markers = [], routes = [] }) {
  const readiness = getProjectReadinessSummary({ project, segments, sessions, media, markers, routes });
  return [
    ...readiness.blockers,
    ...readiness.warnings,
    ...getVisibilityWarnings(project, { visibleFlag: 'published_to_client' }),
  ];
}

export function getProjectDetailSummary({ project, segments = [], sessions = [], media = [], markers = [], routes = [] }) {
  const readiness = getProjectReadinessSummary({ project, segments, sessions, media, markers, routes });
  const mediaCounts = toArray(media).reduce((accumulator, item) => {
    const key = item.media_type || 'unknown';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});
  const markerCounts = toArray(markers).reduce((accumulator, item) => {
    const key = getVisibilityLabelForRecord(item) || 'unknown';
    accumulator[key] = (accumulator[key] || 0) + 1;
    return accumulator;
  }, {});

  const summaryCards = [
    { label: 'Draft data', value: readiness.publishPhase === 'draft_data' ? 'Active' : 'Cleared', detail: 'Draft/internal production data stays company-side until internal review is complete.', ready: readiness.publishPhase !== 'draft_data' },
    { label: 'Internal review', value: readiness.reviewReadiness ? 'Ready' : 'Pending', detail: `${readiness.blockers.length} blockers and ${readiness.warnings.length} warnings are currently open.`, ready: readiness.reviewReadiness },
    { label: 'Client-visible package', value: `${readiness.summary.publishSafeMedia}/${readiness.summary.publishedMedia}`, detail: 'Publish-safe media currently selected for the client package.', ready: readiness.summary.unsafePublishedMedia === 0 && readiness.summary.publishedMedia > 0 },
    { label: 'Route and session coverage', value: `${readiness.summary.coverage.routeCompleteness}% / ${readiness.summary.coverage.sessionCompleteness}%`, detail: `${readiness.summary.segmentsMissingRoutes} segments missing routes and ${readiness.summary.segmentsMissingSessions} missing sessions.`, ready: readiness.summary.segmentsMissingRoutes === 0 && readiness.summary.segmentsMissingSessions === 0 },
    { label: 'Required view coverage', value: `${readiness.summary.viewTypesPresent.length}/${readiness.summary.requiredViewTypes.length || 0}`, detail: readiness.summary.requiredViewTypes.length ? `${readiness.summary.segmentsMissingRequiredViews} segments still missing required views.` : 'Expected views have not been defined yet.', ready: readiness.summary.requiredViewTypes.length > 0 && readiness.summary.segmentsMissingRequiredViews === 0 },
    { label: 'Publish state', value: project?.published_to_client ? 'Published' : readiness.publishReadiness ? 'Publish Ready' : 'Publish Blocked', detail: project?.published_to_client ? 'Client portal is currently showing the published package.' : 'Client release remains gated behind the readiness checks below.', ready: project?.published_to_client || readiness.publishReadiness },
  ];

  const publishSummary = {
    phase: readiness.publishPhase,
    phaseLabel: readiness.publishPhase === 'client_published' ? 'Client-visible published data' : readiness.publishPhase === 'internally_reviewed' ? 'Internally reviewed data' : 'Draft data',
    blockers: readiness.blockers.length,
    warnings: readiness.warnings.length,
    safeMedia: readiness.summary.publishSafeMedia,
    selectedMedia: readiness.summary.publishedMedia,
    reviewedMarkers: readiness.summary.reviewedMarkers,
    totalMarkers: readiness.summary.totalMarkers,
  };

  return { readiness, mediaCounts, markerCounts, summaryCards, publishSummary };
}

export function getFieldSessionSummary(params = {}) { /* unchanged below */
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

export function getFieldSessionViewModel({ checkpoints = [], storedEvents = [], localEvents = [], timer = { elapsed: 0, isRunning: false } }) {
  const sessionSummary = getFieldSessionSummary({ checkpoints, events: [...toArray(storedEvents), ...toArray(localEvents)] });
  const groupedEvents = sessionSummary.groupedEvents;
  const eventCards = [
    { label: 'Total events', value: sessionSummary.totalEvents, detail: 'All lifecycle, checkpoint, and issue-note events recorded for this run.' },
    { label: 'Checkpoint hits', value: groupedEvents.checkpoints.length, detail: 'Reference points logged while moving through the route.' },
    { label: 'Notes/issues', value: groupedEvents.notes.length, detail: 'Context entries explaining interruptions, misses, or review concerns.' },
    { label: 'Timer', value: formatTimestamp(timer.elapsed), detail: timer.isRunning ? 'Live timer state for the active field session.' : 'Timer is idle until a session is started.' },
  ];

  return {
    sessionSummary,
    groupedEvents,
    eventCards,
  };
}

export function getMarkerValidationWarnings(marker = {}, { mediaFiles = [], checkpoints = [], assetLocations = [] } = {}) {
  const warnings = [];
  const selectedMedia = toArray(mediaFiles).find((item) => item.id === marker.media_file_id);
  const hasCheckpointAssociation = !!marker.route_checkpoint_id || !!marker.checkpoint_reference?.trim?.();
  const hasAssetAssociation = !!marker.asset_location_id || !!marker.asset_location_reference?.trim?.();

  if (!marker.project_id) warnings.push('Choose the project so the marker appears in the correct operational scope.');
  if (!marker.media_file_id) warnings.push('Choose the source media file before saving the marker.');
  if (selectedMedia && marker.project_id && selectedMedia.project_id && selectedMedia.project_id !== marker.project_id) warnings.push('Selected media belongs to a different project than the marker.');
  if (marker.timestamp_seconds === '' || marker.timestamp_seconds === null || Number.isNaN(Number(marker.timestamp_seconds)) || Number(marker.timestamp_seconds) < 0) warnings.push('Enter a valid non-negative timestamp for the marker.');
  if (!marker.marker_label?.trim()) warnings.push('Add a marker label that explains what the reviewer or client should notice.');
  if (!hasCheckpointAssociation && !hasAssetAssociation) warnings.push('Link the marker to a checkpoint or asset reference so reviewers can trace the association.');
  if (marker.route_checkpoint_id && !toArray(checkpoints).some((checkpoint) => checkpoint.id === marker.route_checkpoint_id)) warnings.push('Selected checkpoint association no longer exists in the current dataset.');
  if (marker.asset_location_id && !toArray(assetLocations).some((asset) => asset.id === marker.asset_location_id)) warnings.push('Selected asset association no longer exists in the current dataset.');

  return [...warnings, ...getVisibilityWarnings(marker)];
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
    { key: 'markerType', getValue: (marker) => marker.marker_type },
  ];

  const filteredMarkers = toArray(markers).filter((marker) => {
    const media = mediaMap[marker.media_file_id];
    const searchText = toSearchText(marker.marker_label, media?.media_title || '');
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

export function getClientVisibleProjectData({ project, segments = [], media = [], markers = [], previewMode = false }) {
  const publishedMedia = toArray(media)
    .filter((item) => previewMode ? isMediaPublishSafe(item) && !!item.publish_to_client : item.publish_to_client && isMediaPublishSafe(item))
    .map((item) => ({
      ...item,
      internal_notes: undefined,
      external_storage_path: undefined,
      original_file_url: undefined,
    }));
  const clientVisibleMarkers = toArray(markers)
    .filter((marker) => getVisibilityLabelForRecord(marker) === 'client_visible' && marker.confidence_level === 'confirmed')
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
      expected_views_json: undefined,
      route_length_notes: undefined,
    }));

  return {
    project: project ? { ...project, internal_notes: undefined } : null,
    segments: clientVisibleSegments,
    media: publishedMedia,
    markers: clientVisibleMarkers,
    groupedMedia: groupMediaBySegmentViewSession(publishedMedia),
  };
}

export function getClientProjectViewerModel({ project, segments = [], media = [], markers = [], search = '', selectedSegmentId = 'all', selectedViewType = 'all', previewMode = false }) {
  const clientVisibleProjectData = getClientVisibleProjectData({ project, segments, media, markers, previewMode });
  const publishedMedia = clientVisibleProjectData.media;
  const clientMarkers = clientVisibleProjectData.markers;
  const segmentMap = buildEntityMap(clientVisibleProjectData.segments);
  const mediaMap = buildEntityMap(publishedMedia);
  const normalizedSearch = search.toLowerCase();
  const viewTypeOptions = [...new Set(publishedMedia.map((item) => item.view_type).filter(Boolean))];

  const filteredSegments = clientVisibleProjectData.segments.filter((segment) => {
    const matchesSearch = toSearchText(segment.street_name, segment.from_intersection, segment.to_intersection).includes(normalizedSearch);
    return matchesSearch && (selectedSegmentId === 'all' || selectedSegmentId === segment.id);
  });

  const filteredMedia = publishedMedia.filter((item) => {
    const matchesSearch = toSearchText(item.media_title_override_for_client, item.media_title, item.client_visible_notes).includes(normalizedSearch);
    const matchesSegment = selectedSegmentId === 'all' || item.street_segment_id === selectedSegmentId;
    const matchesViewType = selectedViewType === 'all' || item.view_type === selectedViewType;
    return matchesSearch && matchesSegment && matchesViewType;
  });

  const filteredMarkers = clientMarkers.filter((marker) => {
    const mediaFile = mediaMap[marker.media_file_id];
    const matchesSearch = toSearchText(marker.marker_label, marker.client_visible_notes, mediaFile?.media_title).includes(normalizedSearch);
    const matchesSegment = selectedSegmentId === 'all' || mediaFile?.street_segment_id === selectedSegmentId;
    return matchesSearch && matchesSegment;
  });

  const groupedMedia = filteredMedia.reduce((accumulator, item) => {
    const key = item.street_segment_id || 'unassigned';
    accumulator[key] ||= [];
    accumulator[key].push(item);
    return accumulator;
  }, {});

  const groupedMarkers = filteredMarkers.reduce((accumulator, marker) => {
    const mediaFile = mediaMap[marker.media_file_id];
    const key = mediaFile?.street_segment_id || 'unassigned';
    accumulator[key] ||= [];
    accumulator[key].push({ marker, mediaFile });
    return accumulator;
  }, {});

  return {
    clientVisibleProjectData,
    publishedMedia,
    clientMarkers,
    segmentMap,
    mediaMap,
    viewTypeOptions,
    filteredSegments,
    filteredMedia,
    filteredMarkers,
    groupedMedia,
    groupedMarkers,
  };
}
