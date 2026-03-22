# CCG Site Documentation Portal v2 Architecture

## Goal
Shift the product from a segment / route / checkpoint-first model into a simpler workflow centered on projects, capture sessions, session entries, GPS-track pairing, searchable timeline indexing, and a cleaner client portal.

## Core workflow
1. **Client**
   - Owns the relationship and portal access context.
2. **Project**
   - Top-level container for scope, release controls, and all downstream work.
3. **Capture Sessions**
   - Represent the real field recording runs for a project.
4. **Capture Session Entries**
   - Hold notes, observations, issues, and GPS-pairing moments tied to each session.
5. **Field Session**
   - Used during capture to run the live session and log timing-aware events.
6. **Media Library + GPS pairing**
   - Uploaded media is attached to the correct project/session and paired with GPX or FIT tracks.
7. **Timeline Review**
   - Session entries, media, and GPS tracks are indexed into searchable timeline items for internal QA.
8. **Client Portal**
   - Clients review the published summary, released media, and published searchable timeline package.

## Page model
### Kept and adapted
- Dashboard
- Clients
- Users
- Projects
- Project Detail
- Capture Sessions
- Field Session
- Media Library
- Review Cases
- Client Portal Home
- Client Project Viewer
- System Instructions

### Added / rebuilt
- Capture Session Entries
- Timeline Review
- GPS / track pairing flow embedded in Media Library

### Removed or demoted
- Street Segments page removed as a primary workflow surface
- Route Editor page removed as a primary workflow surface
- Marker Review demoted into Timeline Review responsibilities
- Asset Locations no longer part of the main app workflow

## Data model changes
### Added entities
- `CaptureSessionEntry`
- `GpsTrack`
- `TimelineIndexItem`

### Removed entities
- `StreetSegment`
- `RoutePath`
- `RouteCheckpoint`
- `RouteTemplate`
- `AssetLocation`
- `MediaMarker`

### Edited entities
- `CaptureSession`
- `MediaFile`
- `FieldSessionEvent`
- `ReviewCase`

## Guidance model
Every major page now uses a single collapsible instruction panel with exactly these sections:
1. What this page is for
2. What you do here
3. What each major part of the page does
4. Example
5. What happens after this
6. Tips / mistakes to avoid

## Intended result
The repo now supports a cleaner operating model:
- less setup-heavy planning
- less dependence on map drawing and checkpoints
- better alignment to real field capture behavior
- stronger support for video + GPX/FIT pairing
- a clearer searchable timeline for both internal review and client delivery
