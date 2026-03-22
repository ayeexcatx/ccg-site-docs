# Architecture Overview

## What the app is centered around now

The rebuilt app is centered on a **session-first, GPS-track-based workflow**.

That means the core operational path is:

1. define the work as capture session entries
2. generate the real capture sessions from those entries
3. run those sessions in the field
4. upload media and GPS tracks
5. pair the session video with the GPX/FIT track
6. create searchable timeline index entries
7. expose reviewed results in the client portal

The important shift is that the system now treats the **session** as the operational center of the workflow.

## What old workflow concepts were removed or demoted

The rebuilt direction no longer treats the following as the main workflow backbone:

- street segments as the primary planning object
- route drawing as the first required operational task
- manual checkpoints as the primary way to understand location in a recording
- marker-by-marker manual review as the main indexing strategy

Some of these concepts may still appear in older code or support pages, but they are no longer the primary model the repo documentation should describe.

## Main operational entities now

The main workflow entities are:

- **ClientOrganization**: who the work is for
- **Project**: the top-level job container
- **CaptureSessionEntry**: what needs to be recorded
- **CaptureSession**: the generated recording task
- **FieldSessionEvent**: light field notes tied to a session
- **MediaFile**: the uploaded recording or related media file
- **GpsTrack**: the uploaded GPX/FIT track
- **SessionSync**: the pairing/alignment record between media and track
- **TimelineIndexEntry**: the searchable time/location result
- **SuggestedCutPoint**: optional cut suggestions for long media
- **ReviewCase**: follow-up and issue tracking

## Where future GPS extraction and timeline enrichment work should plug in

Future automation work should plug in **after upload and pairing**, not before the crew can do normal work.

The clean insertion points are:

- **GpsTrack parsing**: turning uploaded GPX/FIT files into usable timed track data
- **SessionSync generation**: aligning the media timeline and the GPS timeline
- **TimelineIndexEntry generation**: creating draft searchable moments from the paired data
- **Search enrichment**: improving road, address, range, intersection, and nearby-place search text
- **Suggested cut generation**: identifying moments where long recordings could be split or bookmarked later

This matters because the rebuilt app should let operations complete the basic session workflow even if future enrichment becomes more advanced later.

## Practical reference

If you need to understand the rebuilt direction quickly, use this order:

1. `docs/ccg-v2-workflow.md`
2. `README.md`
3. `EntityCopies/` for exact entity definitions
4. workflow pages under `src/pages/` for how the app currently presents the process
