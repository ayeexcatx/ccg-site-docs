# CCG V2 Architecture Notes

This document summarizes the same rebuilt direction described in `docs/ccg-v2-workflow.md`, but in shorter reference form.

## Current center of the app

The app is now centered on:

- `CaptureSessionEntry` as the planning definition
- `CaptureSession` as the real recording task
- `MediaFile` + `GpsTrack` pairing after upload
- `SessionSync` as the timing alignment layer
- `TimelineIndexEntry` as the searchable output used in internal review and client search

## Main workflow spine

1. project setup
2. capture session entry setup
3. generated capture sessions
4. field recording
5. video + GPX/FIT upload
6. media/track pairing
7. timeline indexing
8. human review
9. client portal release

## Old concepts that are no longer primary

The rebuilt app no longer treats these as the main workflow backbone:

- segment-first planning
- route drawing as the required starting point
- heavy checkpoint logging during recording
- browse-only delivery without searchable timeline support

## Practical reminder

When updating docs or workflow guidance in this repo, describe the app as **session-first and GPS-track-based**.

If exact entity fields matter, use `EntityCopies/` as the source of truth.
