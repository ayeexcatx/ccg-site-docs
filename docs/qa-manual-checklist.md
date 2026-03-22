# CCG Site Documentation Portal Manual QA Checklist

This checklist is meant to be operational, not ceremonial. Each flow below explains:
- what to do in the UI,
- what business result should happen,
- why that result matters downstream.

## End-to-end workflow sequence
1. Create the client organization.
2. Create the project and define required capture outputs.
3. Add street segments that define scope.
4. Create a capture session for each segment run.
5. Draw and save the route path.
6. Add and reorder checkpoints until they match the real travel order.
7. Log field-session events during capture.
8. Create and edit markers after media review.
9. Validate project readiness and publish only when blockers are cleared.
10. Verify the client portal shows only client-safe published output.

## 1) Create a client
- Navigate to **Clients** and create a new client with name, code, access mode, and contact info.
- Expected business result: a client organization record exists and can be selected by new projects.
- Why it matters: the client record controls who should ultimately see the published portal package and prevents projects from being created without a clear ownership target.
- QA checks:
  - The client appears in the list immediately after save.
  - Internal notes stay company-only.
  - Client-visible notes are clearly separated from internal notes.

## 2) Create a project
- Navigate to **Projects** and create a project tied to the intended client.
- Fill in project code, municipality/state, scope summary, and required media view toggles.
- Expected business result: the project becomes the top-level scope container for segments, sessions, routes, media, and markers.
- Why it matters: if required view toggles are wrong, readiness and publish checks will be wrong later.
- QA checks:
  - The project card appears in the list.
  - The project links to the correct client.
  - Required view toggles match the engagement scope.
  - Internal notes do not appear anywhere in client-facing views.

## 3) Add segments
- Open the project workflow for street segments and add at least one segment with street name and intersections.
- Expected business result: the segment defines the geographic unit that routes, sessions, media, and portal grouping depend on.
- Why it matters: without clean segment scope, downstream route coverage and client browsing become unreliable.
- QA checks:
  - Segment metadata saves correctly.
  - The segment is selectable in route and session workflows.
  - Client-visible notes on the segment are objective and publish-safe.

## 4) Create a capture session
- Navigate to **Capture Sessions** and create a session linked to the correct project and segment.
- Expected business result: a single operational run exists that later ties together route timing, event logs, uploaded media, and marker review.
- Why it matters: sessions are the spine that keeps field execution attached to the right segment and project.
- QA checks:
  - Session status starts in a planning-ready state.
  - The session is available in Route Editor and Field Session.
  - Project and segment associations are correct.

## 5) Draw a route
- Open **Route Editor**.
- Choose the project, segment, and capture session in order.
- Add a route name, then click **Draw Route** and place at least two points.
- Add a start checkpoint and an end checkpoint.
- Expected business result: a usable route path exists for the session and can support field timing plus review context.
- Why it matters: incomplete or unanchored routes break checkpoint estimation and downstream QA interpretation.
- QA checks:
  - Save remains blocked until project, segment, session, name, geometry, and required anchors exist.
  - The summary shows the correct start and end checkpoint labels.
  - Warnings disappear only when the route is operationally complete.

## 6) Add and reorder checkpoints
- In **Route Editor**, add checkpoints with clear labels and map locations.
- Reorder them via drag-and-drop or move buttons until they match field traversal order.
- Expected business result: the checkpoint list reflects the actual route sequence used by documenters and reviewers.
- Why it matters: checkpoint order drives route summaries, event estimation, and marker context.
- QA checks:
  - Reordered checkpoints persist in the updated order.
  - Blank labels are warned or blocked before route save.
  - Client-visible checkpoints are intentionally marked, not left on by accident.

## 7) Log field events
- Open **Field Session**, pick the session, and run through start / pause / resume / end plus route-reference events.
- Add issue notes when something meaningful changes in the field.
- Expected business result: the session produces a trustworthy internal timeline that reviewers can use later.
- Why it matters: marker timing and QA interpretation depend on this timeline when media review begins.
- QA checks:
  - Events appear in chronological order.
  - Summary totals and estimated checkpoint timing update after the run.
  - Notes describe operational issues rather than client-facing narrative.

## 8) Create and edit markers
- Open **Marker Review** and create or edit markers tied to the reviewed media.
- Add timestamp, label, and either a checkpoint reference or asset reference.
- Only turn on client visibility when client-visible notes are clean and factual.
- Expected business result: markers become traceable review artifacts tied to the right project/media context.
- Why it matters: markers without associations or with leaked internal language create review confusion and portal risk.
- QA checks:
  - Save is blocked when the marker is missing a project, media, or meaningful association.
  - Project/media mismatch warnings appear when associations conflict.
  - If client-visible notes copy internal notes or contain draft wording, the warning panel explains the risk.

## 9) Publish a project
- Open **Project Detail** and review the publish checklist.
- Confirm segments, required view types, session completion, media, marker review, and client-visible note hygiene.
- Expected business result: the project is only considered publish-ready when the internal package is complete enough for client consumption.
- Why it matters: publication is the business gate that moves content into the client portal.
- QA checks:
  - Publish safeguard warnings describe every remaining blocker.
  - Draft/internal wording in client-facing notes produces a warning.
  - The project is not treated as ready just because some content exists.

## 10) Validate the client-visible portal output
- Open the client portal viewer for the published project.
- Review segments, media, and markers using search and filters.
- Expected business result: only published media, client-visible notes, and approved client-safe markers appear.
- Why it matters: this is the final customer-facing proof that internal-only content is still protected.
- QA checks:
  - Internal notes never appear in portal cards, media, or markers.
  - Unpublished media does not appear.
  - Markers only appear when tied to published media and marked client-visible.
  - Counts for visible segments, media, and markers match the approved records.

## Regression focus areas
- Save guards in Route Editor still prevent incomplete routes.
- Marker Review still blocks risky client-visible marker saves.
- Project Detail still explains why incomplete projects are not publish-ready.
- Client portal still strips internal notes and unpublished records.
