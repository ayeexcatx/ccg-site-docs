import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

async function loadDomainWorkflowModule() {
  const sourcePath = new URL('../src/lib/domainWorkflows.js', import.meta.url);
  const source = await readFile(sourcePath, 'utf8');
  const displayUtilsUrl = new URL('../src/lib/displayUtils.js', import.meta.url).href;
  const rewritten = source.replace("@/lib/displayUtils", displayUtilsUrl);
  const tempDir = await mkdtemp(join(tmpdir(), 'ccg-domain-tests-'));
  const tempFile = join(tempDir, 'domainWorkflows.testable.mjs');
  await writeFile(tempFile, rewritten);
  const module = await import(pathToFileURL(tempFile).href);
  return { module, cleanup: () => rm(tempDir, { recursive: true, force: true }) };
}

const { module: workflows, cleanup } = await loadDomainWorkflowModule();

try {
  const checkpoints = workflows.orderCheckpoints([
    { id: 'c3', checkpoint_label: 'End', checkpoint_type: 'end', sequence_order: 2 },
    { id: 'c1', checkpoint_label: 'Start', checkpoint_type: 'start', sequence_order: 0 },
    { id: 'c2', checkpoint_label: 'Middle', checkpoint_type: 'intersection', sequence_order: 1 },
  ]);
  assert.deepEqual(checkpoints.map((item) => item.id), ['c1', 'c2', 'c3']);
  assert.deepEqual(checkpoints.map((item) => item.sequence_order), [0, 1, 2]);

  const routeSummary = workflows.getRoutePathSummary(
    [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }],
    checkpoints,
  );
  assert.equal(routeSummary.completenessLabel, 'Operationally complete');
  assert.equal(routeSummary.startLabel, 'Start');
  assert.equal(routeSummary.endLabel, 'End');

  const readinessBlocked = workflows.getProjectReadinessSummary({
    project: { include_photos: true, include_standard_video: true, client_visible_notes: 'Draft portal text' },
    segments: [{ id: 'seg-1' }],
    sessions: [{ id: 'sess-1', street_segment_id: 'seg-1', session_status: 'uploaded' }],
    media: [{ id: 'm1', street_segment_id: 'seg-1', view_type: 'profile', file_url: 'file' }],
    markers: [{ id: 'mk-1', confidence_level: 'estimated', is_client_visible: true, media_file_id: 'm1' }],
    routes: [{ id: 'r1', street_segment_id: 'seg-1' }],
  });
  assert.equal(readinessBlocked.publishReadiness, false);
  assert.ok(readinessBlocked.blockers.some((item) => item.includes('Required view types present')));
  assert.ok(readinessBlocked.blockers.some((item) => item.includes('Markers reviewed')));
  assert.ok(readinessBlocked.blockers.some((item) => item.includes('Client-visible notes validated')));

  const fieldSummary = workflows.getFieldSessionSummary({
    checkpoints: [
      { id: 'cp-1', checkpoint_label: 'Start', sequence_order: 0 },
      { id: 'cp-2', checkpoint_label: 'Mid', sequence_order: 1 },
    ],
    events: [
      { event_type: 'intersection', timestamp_offset_seconds: 35 },
      { event_type: 'session_start', timestamp_offset_seconds: 0 },
      { event_type: 'issue_note', timestamp_offset_seconds: 10 },
    ],
  });
  assert.equal(fieldSummary.totalEvents, 3);
  assert.equal(fieldSummary.groupedEvents.lifecycle.length, 1);
  assert.equal(fieldSummary.groupedEvents.checkpoints.length, 1);
  assert.equal(fieldSummary.groupedEvents.notes.length, 1);
  assert.equal(fieldSummary.estimatedTimeline[1].estimated_timestamp_seconds, 10);

  const markerSummary = workflows.getMarkerReviewSummary({
    markers: [
      { id: 'a', project_id: 'p1', media_file_id: 'm1', marker_label: 'Ramp', marker_type: 'curb_ramp', confidence_level: 'confirmed', is_client_visible: true },
      { id: 'b', project_id: 'p1', media_file_id: 'm2', marker_label: 'Sign', marker_type: 'landmark', confidence_level: 'manual', internal_notes: 'internal only' },
    ],
    mediaFiles: [
      { id: 'm1', media_title: 'File One', capture_session_id: 's1' },
      { id: 'm2', media_title: 'File Two', capture_session_id: 's2' },
    ],
    filters: { projectId: 'p1', visibility: 'client_visible', search: 'ramp' },
  });
  assert.equal(markerSummary.filteredMarkers.length, 1);
  assert.equal(markerSummary.confidenceCounts.confirmed, 1);
  assert.equal(Object.keys(markerSummary.groupedByMedia)[0], 'm1');

  const markerWarnings = workflows.getMarkerValidationWarnings(
    {
      project_id: 'p1',
      media_file_id: 'm2',
      marker_label: 'Pole',
      timestamp_seconds: 4,
      is_client_visible: true,
      internal_notes: 'internal memo',
      client_visible_notes: 'internal memo',
    },
    { mediaFiles: [{ id: 'm2', project_id: 'p2' }] },
  );
  assert.ok(markerWarnings.some((item) => item.includes('different project')));
  assert.ok(markerWarnings.some((item) => item.includes('checkpoint or asset reference')));
  assert.ok(markerWarnings.some((item) => item.includes('mirror internal notes')));

  const clientData = workflows.getClientVisibleProjectData({
    project: { id: 'p1', internal_notes: 'secret' },
    segments: [
      { id: 'seg-visible', client_visible_notes: 'Client can see this' },
      { id: 'seg-hidden', internal_notes: 'internal only' },
    ],
    media: [
      { id: 'media-visible', publish_to_client: true, internal_notes: 'internal', street_segment_id: 'seg-visible' },
      { id: 'media-hidden', publish_to_client: false, internal_notes: 'still internal' },
    ],
    markers: [
      { id: 'marker-visible', media_file_id: 'media-visible', is_client_visible: true, internal_notes: 'internal' },
      { id: 'marker-hidden', media_file_id: 'media-hidden', is_client_visible: true, internal_notes: 'internal' },
    ],
  });
  assert.equal(clientData.project.internal_notes, undefined);
  assert.equal(clientData.segments.length, 1);
  assert.equal(clientData.media.length, 1);
  assert.equal(clientData.markers.length, 1);

  const viewerModel = workflows.getClientProjectViewerModel({
    project: { id: 'p1' },
    segments: [{ id: 'seg-visible', street_name: 'Main St', client_visible_notes: 'Visible' }],
    media: [{ id: 'media-visible', publish_to_client: true, street_segment_id: 'seg-visible', view_type: 'profile', media_title: 'Main walk' }],
    markers: [{ id: 'marker-visible', media_file_id: 'media-visible', marker_label: 'Corner', is_client_visible: true, client_visible_notes: 'Approved marker' }],
    search: 'main',
    selectedSegmentId: 'seg-visible',
    selectedViewType: 'profile',
  });
  assert.equal(viewerModel.filteredSegments.length, 1);
  assert.equal(viewerModel.filteredMedia.length, 1);
  assert.equal(viewerModel.filteredMarkers.length, 1);

  console.log('Domain workflow tests passed.');
} finally {
  await cleanup();
}
