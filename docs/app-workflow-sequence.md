# App Workflow Sequence and Intent

The portal is designed around a strict business sequence:

1. **Client Organization** defines who owns the work and who will eventually view the published output.
2. **Project** defines the documentation job, required media views, and publication target.
3. **Street Segment** defines the geographic slice of work.
4. **Capture Session** defines a single operational run for a segment.
5. **Route Path + Checkpoints** define the planned path and reference anchors.
6. **Field Session Events** define the timing spine captured during work.
7. **Media + Marker Review** define reviewed evidence and client-safe references.
8. **Project Readiness / Publish** defines whether the package is complete enough for client release.
9. **Client Portal Viewer** shows only intentionally published, client-visible outputs.

## Design intent
- Upstream records should make downstream records easier, not harder.
- Internal notes may exist throughout the app, but client-facing views must only use client-safe fields and explicit publish flags.
- Route completeness, checkpoint order, field events, and marker associations are not convenience metadata; they are operational dependencies for later QA and publication.

## Practical rule of thumb
If a record would confuse a reviewer, break a route/session relationship, or leak internal process language to a client, the UI should warn early and the workflow helper should make that risk explicit.
