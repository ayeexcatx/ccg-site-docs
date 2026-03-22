# CCG Site Documentation Portal

## Purpose

This repository supports CCG's rebuilt site documentation app for pre-construction and field-condition recording.

The app is now built around **sessions first**:

- define what needs to be recorded as capture session entries
- generate the actual capture sessions crews will run
- record video with a matching GPX or FIT track
- pair the media and track after upload
- build searchable timeline index entries from that pairing
- publish a client portal that can search by road, address, intersection, range, or nearby place

This is no longer a segment-first workflow. The current direction is **session-first and GPS-track-based** rather than route-drawing-first or manual checkpoint-first.

## High-level workflow

1. Create the client organization.
2. Create the project.
3. Add capture session entries for each road, frontage, range, or target area.
4. Generate the capture sessions that crews will actually record.
5. Run each session in the field.
6. Record a GPX or FIT track alongside the video whenever GPS is expected.
7. Upload the video and the GPX/FIT file.
8. Pair the media file and GPS track to the correct session.
9. Generate and review timeline index entries.
10. Publish the approved, client-safe project package to the portal.

For the plain-English workflow, start with `docs/ccg-v2-workflow.md`.

## Main page structure

The rebuilt app centers on these operational pages:

- **Dashboard**: overall workflow status and bottlenecks
- **Clients**: client organization records
- **Projects**: top-level project setup and tracking
- **Project Detail**: project readiness across sessions, pairing, indexing, and release
- **Capture Session Entries**: define what needs to be recorded
- **Capture Sessions**: generated recording tasks and their status
- **Field Session**: live field run, timer, and lightweight event logging
- **Media Library**: upload media, upload GPX/FIT, pair files, and review sync readiness
- **Timeline Review**: confirm or edit auto-generated searchable timeline metadata
- **Review Cases**: track follow-up questions or issues
- **Client Portal Home / Client Project Viewer**: released client-facing search and browsing

Some older pages still exist in the repo, but they are no longer the primary workflow surfaces. The current operating model should be read through the session, media pairing, timeline review, and portal-search flow.

## Data model summary

The main operational entities in the rebuilt workflow are:

- **ClientOrganization**: the client record
- **Project**: the top-level job container
- **CaptureSessionEntry**: the planning definition of a roadway, frontage, range, intersection, or other recording target
- **CaptureSession**: a generated recording task for a specific entry and view
- **FieldSessionEvent**: lightweight timing-aware notes created during field capture
- **MediaFile**: uploaded video, photo, 360, preview, or related file attached to a session
- **GpsTrack**: GPX/FIT or other track file used for pairing and location timing
- **SessionSync**: the alignment between a session's media timeline and its GPS track timeline
- **TimelineIndexEntry**: searchable time/location records generated from paired media and track data
- **SuggestedCutPoint**: optional split suggestions for long recordings
- **ReviewCase / ReviewCaseItem**: follow-up and QA issue tracking

See `EntityCopies/` for the exact repo-side entity definitions.

## Entity definition source of truth

`EntityCopies/` is the source of truth for entity definitions as they currently exist in this repository.

Important contributor note:

- make repo-side entity definition changes in `EntityCopies/`
- treat those files as the canonical reference for schema names and fields
- Base44 entity changes are **manually mirrored from that folder**
- do not assume a README or workflow doc is more authoritative than the matching file in `EntityCopies/`

## Architecture notes

The rebuilt system is centered on:

- capture session entries that describe field scope in plain language
- generated capture sessions that represent the real work crews perform
- GPS-track pairing instead of heavy manual checkpoint logging
- timeline indexing that turns long videos into searchable moments
- a client portal that is search-first instead of browse-only

Concepts from the old workflow such as manual segment planning, route drawing as the main setup task, and constant checkpoint logging are either removed from the core workflow or demoted to secondary/supporting roles.

For architecture context, see:

- `docs/ccg-v2-workflow.md`
- `docs/architecture-overview.md`

## Local development

### Prerequisites

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Create an `.env.local` file with the Base44 app settings.

Example:

```bash
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-base44-app.base44.app
```

### Run locally

```bash
npm run dev
```

## Contributor / developer guide

If you are new to the repo, start here:

- **Workflow logic and guidance**
  - `src/lib/workflowGuidance.js`
  - `src/lib/sessionWorkflow.js`
  - `src/lib/gpsWorkflow.js`
  - `src/lib/domainWorkflows.js`
- **Primary workflow pages**
  - `src/pages/CaptureSessionEntries.jsx`
  - `src/pages/CaptureSessions.jsx`
  - `src/pages/FieldSession.jsx`
  - `src/pages/MediaLibrary.jsx`
  - `src/pages/TimelineReview.jsx`
  - `src/pages/portal/ClientProjectViewer.jsx`
- **Documentation**
  - `docs/ccg-v2-workflow.md`
  - `docs/architecture-overview.md`
  - `docs/qa-manual-checklist.md`

When updating workflow documentation, keep it aligned to the current rebuilt direction: session-first planning, GPX/FIT pairing, timeline indexing, and client search.
