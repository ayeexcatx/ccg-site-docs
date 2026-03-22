const DEFAULT_STORAGE_ADAPTER_ORDER = ['native_upload', 'future_connector_storage', 'external_link'];

export const FUTURE_FEATURE_BLUEPRINTS = {
  viewer360: {
    key: 'viewer360',
    title: '360 Media Viewer Support',
    status: 'Future-ready placeholder',
    summary: 'Reserve a dedicated viewer capability layer so 360 assets can be recognized, routed to the correct component, and kept under internal delivery controls before any immersive renderer is introduced.',
    extensionPoints: [
      'MediaFile records should continue to store standard metadata, but future 360-specific descriptors should be attached through additive metadata fields rather than replacing current view_type or media_type values.',
      'UI code should ask a viewer capability helper what renderer family is needed instead of branching directly on raw media_type strings inside page components.',
      'Client publishing should remain opt-in and in-house-first so any future immersive viewer can be approved internally before portal release.',
    ],
    entities: ['Project', 'CaptureSession', 'MediaFile'],
    workflow: 'Project requirements define whether 360 capture is expected, sessions gather the files, Media Library registers the assets, and client-facing publishing still flows through the existing publish flags.',
  },
  mapVideoSync: {
    key: 'mapVideoSync',
    title: 'Route-to-Media Sync Calculations',
    status: 'Future-ready placeholder',
    summary: 'Create a normalized sync envelope that future services can populate with route distance, checkpoint alignment, and media timestamps without forcing current pages to change their data model.',
    extensionPoints: [
      'RouteEditor should keep owning route geometry and checkpoint order, while sync calculators enrich that route with derived timing metadata.',
      'Marker review should consume sync suggestions as editable context, not as an automatic replacement for reviewer judgment.',
      'All sync outputs should be traceable back to session, route, checkpoint, and media identifiers already used throughout the repo.',
    ],
    entities: ['RoutePath', 'RouteCheckpoint', 'CaptureSession', 'MediaFile', 'MediaMarker'],
    workflow: 'Staff define the route and checkpoints first, media is associated with sessions second, and only then should future sync processors estimate timestamps or path positions for review.',
  },
  aiTagging: {
    key: 'aiTagging',
    title: 'AI-assisted Marker Suggestions',
    status: 'Future-ready placeholder',
    summary: 'Prepare an internal suggestion contract that can propose markers, confidence notes, and evidence references while preserving the existing manual/estimated/confirmed review workflow.',
    extensionPoints: [
      'Suggested markers should be stored or transformed into the current MediaMarker shape with explicit provenance fields rather than bypassing review.',
      'Confidence labels must remain understandable to operations staff, with AI output clearly separated from confirmed publication-ready markers.',
      'Any inference pipeline should run against approved in-house providers or internal services before external AI is considered.',
    ],
    entities: ['MediaMarker', 'MediaFile', 'RouteCheckpoint', 'AssetLocation'],
    workflow: 'Media and route context become input evidence, suggestion payloads are reviewed in Marker Review, and only reviewer-confirmed markers advance to downstream publishing.',
  },
  storageAdapters: {
    key: 'storageAdapters',
    title: 'External Storage Adapters for Large Media',
    status: 'Future-ready placeholder',
    summary: 'Introduce adapter descriptors so very large files can be registered from approved storage systems while the application keeps a single internal metadata model and publishing workflow.',
    extensionPoints: [
      'Media registration should work with adapter metadata objects instead of page-level custom fields for each storage vendor.',
      'Adapters must expose capabilities declaratively so upload/stream/archive behavior can change without refactoring the media forms.',
      'Internal storage remains the default path; external adapters are additive and should preserve the same visibility and approval controls.',
    ],
    entities: ['MediaFile', 'CaptureSession', 'Project'],
    workflow: 'Media Library stores the operational record, the adapter descriptor explains where the bytes live, and portal/client logic still reads from the same publish and visibility controls.',
  },
};

export const STORAGE_ADAPTER_BLUEPRINTS = {
  native_upload: {
    key: 'native_upload',
    label: 'Base44 Native Upload',
    family: 'in_house_default',
    isDefault: true,
    capabilities: ['upload', 'thumbnail', 'publish'],
    adminNotes: 'Use this today for normal uploads and direct file registration inside the current stack.',
  },
  future_connector_storage: {
    key: 'future_connector_storage',
    label: 'In-house Object Store (Future)',
    family: 'in_house_preferred',
    isDefault: false,
    capabilities: ['register_only', 'stream', 'archive', 'publish'],
    adminNotes: 'Reserved for a future internal object-storage adapter that can handle larger media while preserving current metadata and review workflows.',
  },
  external_link: {
    key: 'external_link',
    label: 'Approved External Registration',
    family: 'approved_external',
    isDefault: false,
    capabilities: ['register_only', 'archive'],
    adminNotes: 'Use when the operational record must stay in the app but the original master remains in an approved external archive or storage platform.',
  },
};

export function getFutureFeatureBlueprints() {
  return Object.values(FUTURE_FEATURE_BLUEPRINTS);
}

export function getStorageAdapterBlueprints() {
  return DEFAULT_STORAGE_ADAPTER_ORDER.map((key) => STORAGE_ADAPTER_BLUEPRINTS[key]).filter(Boolean);
}

export function createViewerCapabilityMatrix(mediaRecord = {}) {
  const normalizedType = mediaRecord.media_type || 'unknown';
  const normalizedView = mediaRecord.view_type || 'unknown_view';
  const is360Candidate = normalizedType === 'video_360' || normalizedView === '360_walk';

  return {
    mediaId: mediaRecord.id || null,
    mediaType: normalizedType,
    viewType: normalizedView,
    viewerFamily: is360Candidate ? 'immersive_future' : 'standard_media',
    requiresSpecialRenderer: is360Candidate,
    placeholderComponentKey: is360Candidate ? 'Future360MediaViewer' : 'NativeMediaCard',
    adminExplanation: is360Candidate
      ? 'This record is eligible for a future 360 viewer. Keep current metadata complete so a dedicated immersive renderer can be attached later without remapping the media inventory.'
      : 'This record can remain on the standard media path until a specialized viewer is needed.',
  };
}

export function buildRouteMediaSyncEnvelope({ route = null, checkpoints = [], mediaFile = null, session = null }) {
  return {
    status: 'sync_not_computed',
    routeId: route?.id || null,
    mediaFileId: mediaFile?.id || null,
    captureSessionId: session?.id || mediaFile?.capture_session_id || route?.capture_session_id || null,
    checkpointIds: checkpoints.map((checkpoint) => checkpoint.id).filter(Boolean),
    routePointCount: safeJsonPointCount(route?.polyline_json),
    estimatedAlignmentMoments: [],
    futureComputationNotes: [
      'Use current route geometry plus ordered checkpoints as the canonical spatial path.',
      'Derive timing only after the target media file and capture session are stable.',
      'Persist future sync results as additive metadata so manual review can compare suggested versus confirmed timestamps.',
    ],
  };
}

export function buildMarkerSuggestionContext({ marker = null, mediaFile = null, route = null, checkpoints = [], assetLocations = [] }) {
  const mediaLabel = mediaFile?.media_title || mediaFile?.original_filename || 'Selected media';
  const defaultSuggestedMarkers = [
    {
      id: `draft-landmark-${mediaFile?.id || 'sample'}`,
      title: 'Draft landmark candidate',
      markerType: 'landmark',
      draftLabel: marker?.marker_label ? `${marker.marker_label} (AI draft variant)` : 'Potential landmark or business frontage',
      timestampLabel: marker?.timestamp_seconds != null ? `${Math.round(marker.timestamp_seconds)}s reference point` : 'Awaiting timeline estimate',
      evidenceNote: `Reserved placeholder for future landmark/business suggestions on ${mediaLabel}.`,
      provenance: 'No provider connected yet — internal draft contract only.',
      status: 'Draft only',
    },
    {
      id: `draft-sign-${mediaFile?.id || 'sample'}`,
      title: 'Draft sign candidate',
      markerType: 'sign',
      draftLabel: 'Potential regulatory or wayfinding sign',
      timestampLabel: 'Awaiting timeline estimate',
      evidenceNote: 'Use this slot for future sign detection suggestions once approved internal tooling exists.',
      provenance: 'Placeholder only; must be reviewed and rewritten by staff.',
      status: 'Draft only',
    },
  ];

  return {
    markerId: marker?.id || null,
    mediaFileId: mediaFile?.id || marker?.media_file_id || null,
    routeId: route?.id || null,
    nearbyCheckpointCount: checkpoints.length,
    nearbyAssetCount: assetLocations.length,
    suggestionStatus: 'awaiting_internal_ai_provider',
    suggestedMarkers: defaultSuggestedMarkers,
    reviewerGuardrails: [
      'Treat machine-generated suggestions as draft evidence only.',
      'Do not elevate suggestion output directly to confirmed or client-visible status.',
      'Record provenance so staff can see which provider or ruleset produced the suggestion.',
      'AI is an assistant only and must never replace staff judgment in the evidence workflow.',
    ],
    reviewActions: [
      {
        key: 'accept_to_manual_draft',
        label: 'Accept into manual draft',
        description: 'Copies the suggestion into the manual review workflow for staff editing before any visibility decision.',
      },
      {
        key: 'edit_before_save',
        label: 'Edit before saving',
        description: 'Requires staff to adjust labels, timestamps, notes, and linked evidence before the record is kept.',
      },
      {
        key: 'reject_suggestion',
        label: 'Reject suggestion',
        description: 'Dismisses the draft suggestion when it is inaccurate, unsupported, or not useful for the review case.',
      },
    ],
  };
}

export function buildMediaAiPreparation({ mediaFile = null, markerCount = 0, publishReadiness = 'not_reviewed' }) {
  const mediaLabel = mediaFile?.media_title || mediaFile?.original_filename || 'Selected media record';

  return {
    mediaId: mediaFile?.id || null,
    mediaLabel,
    preparationStatus: 'draft_preparation_only',
    requiredReviewMessage: 'AI is an assistant only. Any future tagging suggestions must be reviewed, edited as needed, and approved by staff before they become part of the evidence workflow or anything client-visible.',
    placeholderQueues: [
      {
        key: 'landmark_business_candidates',
        title: 'Landmark / business suggestion queue',
        description: 'Reserved for future draft suggestions tied to storefronts, landmarks, and business frontage that staff can compare against route context and media evidence.',
      },
      {
        key: 'sign_candidates',
        title: 'Sign suggestion queue',
        description: 'Reserved for future sign tagging drafts so staff can confirm sign type, wording, and timestamp before anything is retained.',
      },
    ],
    workflowHooks: [
      `Media remains in the normal manual workflow first, with ${markerCount} current marker records available for human review context.`,
      `Current publish readiness is ${publishReadiness}; draft AI suggestions should not change this state automatically.`,
      'Reviewers should use preview-safe derivatives, internal notes, and marker review panels to validate any future suggestions.',
    ],
  };
}

export function resolveStorageAdapter(storageMode, registry = STORAGE_ADAPTER_BLUEPRINTS) {
  return registry[storageMode] || registry.native_upload || null;
}

function safeJsonPointCount(polylineJson) {
  if (!polylineJson) return 0;
  try {
    const parsed = JSON.parse(polylineJson);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}
