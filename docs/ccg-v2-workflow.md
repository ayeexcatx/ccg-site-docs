# CCG Site Documentation Portal — V2 Workflow

## Purpose of This App

This app is used to manage pre-construction site documentation projects from start to finish.

The goal is to make it easy for CCG to:

- set up a client project quickly
- define what roads or ranges need to be recorded
- generate the needed recording sessions automatically
- record video in the field with as little extra work as possible
- pair each recording with a GPS track
- automatically build a searchable timeline from the video + GPS data
- publish a client portal where the client can search by address, intersection, road name, range, or place

This version of the app is designed to reduce manual setup and reduce manual review work.

Instead of requiring heavy segmentation and route planning before filming, the app is now built around:

- capture session entries
- generated capture sessions
- field sessions
- video + GPX/FIT pairing
- timeline indexing
- client search

---

# High-Level Workflow

The workflow is:

1. Create the client
2. Create the project
3. Add capture session entries
4. Generate capture sessions automatically
5. Go into the field and record the videos
6. Record a GPX/FIT track alongside the video
7. Upload the video and the GPX/FIT file
8. Pair the video and GPS track to the session
9. Let the app generate searchable timeline entries
10. Review and confirm the generated metadata
11. Publish the project to the client portal

---

# Core Concepts

## Client
The company, contractor, municipality, or organization that hired CCG.

## Project
The overall job being documented.

Example:
- Main Street Reconstruction 2026

## Capture Session Entry
A roadway, range, frontage, or recording target that needs to be documented.

Examples:
- Main Street from Oak Ave to Elm Ave
- Robert Street from Main St to Park Ave
- Curb Ramp Range A–F
- Library Frontage

A capture session entry is not a video itself. It is the planning item that tells the app what needs to be recorded.

## Capture Session
A generated recording task for one specific view of one entry.

Examples:
- Main Street – Right Profile
- Main Street – Left Profile
- Main Street – Curb Line / Edge of Pavement
- Main Street – Cross Section
- Main Street – 360 Walk

Each capture session should usually correspond to one actual recording pass.

## Field Session
The real-world use of a capture session in the field. This is when the documenter starts the timer, records the video, and later uploads the related files.

## GPX/FIT Track
A GPS track recorded alongside the video. This is used to determine where the camera was at different times.

## Session Sync
The alignment between the video timeline and the GPS track timeline.

## Timeline Index Entry
A searchable timestamp/location record created from the session sync and GPS data.

Examples:
- 03:40–03:47 near Main Street & Robert Street
- 04:03–04:13 near 474 Main Street
- 01:45–02:56 near JFK High School frontage

These records make long videos searchable.

## Suggested Cut Point
A suggested timestamp where a long recording could be split later if needed.

These are optional helpers. The app does not require cutting videos into segments.

---

# Full Operational Workflow

## Phase 1 — Client Setup

### Page: Clients

Use this page to create the client organization.

Enter:
- client name
- contact information
- optional internal reference details

Example:
- ABC Paving Contractors

After this step:
Go to Projects and create the job.

---

## Phase 2 — Project Setup

### Page: Projects

Use this page to create the project record.

Enter:
- project name
- municipality
- county / state if needed
- contract number if available
- project limits summary
- notes about the job

Example:
- Main Street Reconstruction 2026
- Main Street from Oak Ave to Elm Ave

After this step:
Go to Capture Session Entries.

---

## Phase 3 — Capture Session Entry Setup

### Page: Capture Session Entries

This is where you define what needs to be recorded.

For each road, range, frontage, or recording target, create one entry.

Examples:
- Main Street from Oak Ave to Elm Ave
- Robert Street from Main St to Park Ave
- Curb Ramp Range A–F
- Library Frontage

For each entry, choose which recording views are needed.

Typical default views:
- Right Profile
- Left Profile
- Curb Line / Edge of Pavement
- Cross Section
- optional 360 Walk

Then use the Generate Sessions action.

The app should automatically create the related capture sessions for each entry.

Example:
Entry:
- Main Street from Oak Ave to Elm Ave

Generated sessions:
- Main Street – Right Profile
- Main Street – Left Profile
- Main Street – Curb Line / Edge of Pavement
- Main Street – Cross Section
- optional Main Street – 360 Walk

After this step:
Go to Capture Sessions to review the generated recording plan.

---

## Phase 4 — Review Capture Sessions

### Page: Capture Sessions

This page shows the actual recording tasks that were generated from the entries.

Use this page to:
- check the order of sessions
- confirm the session names
- confirm which sessions need to be recorded
- see the recording status of each session
- track whether video has been uploaded
- track whether GPX/FIT is paired
- track whether timeline indexing is complete

Typical session statuses:
- Planning
- Ready for Documentation
- Recording in Progress
- Recordings Uploaded
- Processing
- Under Review
- Approved for Release
- Published to Client

This page is the main session management page.

After this step:
Go into the field and use Field Session during recording.

---

## Phase 5 — Field Recording

### Page: Field Session

This page is used in the field while recording.

The documenter should:

1. Open the correct capture session
2. Start the field session timer
3. Begin recording on the camera
4. Confirm that the GPX/FIT recording workflow is also active
5. Optionally add simple event notes if something unusual needs to be remembered
6. Stop the field session when the recording pass is complete
7. Mark the session ready for upload/handoff

Important:
This page is no longer meant for heavy manual checkpoint logging.
The main location intelligence should come from the GPS track, not from constant button pressing.

Optional event notes should be used only for:
- unusual site conditions
- special landmarks
- issues worth remembering later
- anything the automatic indexing may not capture clearly

After this step:
Upload the video and GPX/FIT file in Media Library.

---

## Phase 6 — Upload and Pair Files

### Page: Media Library

This page is where the actual files are attached to the session.

For each completed session, upload:
- the video file
- the GPX/FIT track file

Then pair them to the correct capture session.

The app should show:
- video duration
- GPX/FIT duration
- pairing status
- sync preview or sync confidence
- indexing status
- suggested cut points if they exist

At this stage, the system should align:
- the video timeline
- the GPS timeline
- the session record

This is one of the most important parts of the workflow.

After this step:
Go to Timeline Review.

---

## Phase 7 — Timeline Review

### Page: Timeline Review

This page is where the automatically generated timeline metadata is reviewed.

The app should create suggested timeline entries such as:
- likely intersections
- likely addresses
- nearby places
- searchable text
- suggested cut points

Use this page to:
- review the generated results
- confirm accurate entries
- edit anything incorrect
- reject anything that should not be used
- make sure the search metadata is useful and client-friendly

This page replaces a lot of the old manual marker-building work.

The goal is not to manually build everything from scratch.
The goal is to review and improve what the system generated automatically.

After this step:
Go to Project Detail and confirm project readiness.

---

## Phase 8 — Project Readiness Review

### Page: Project Detail

This page is the readiness summary for the whole project.

Use it to confirm:
- entries were created
- sessions were generated
- recordings were completed
- videos were uploaded
- GPX/FIT files were paired
- timeline indexing was completed
- review is complete
- project is ready to publish

This page answers the question:
“Is this project ready for the client?”

After this step:
Publish to the client portal.

---

## Phase 9 — Client Portal

### Page: Client Portal Home
This is the client’s project list.

The client should be able to see:
- all released projects available to them
- basic project summaries

### Page: Client Project Viewer
This is the actual searchable project portal.

The client should be able to:

#### Search by:
- address
- intersection
- road name
- range
- place / landmark

#### Browse by index:
- all roadway entries
- all ranges
- all frontage entries
- all sessions linked to those entries

When the client opens a result, they should be able to:
- jump to the related timestamp in the video
- view the full video if needed
- browse nearby matching results

The client portal should feel like a searchable project library, not like an internal operations page.

---

# What Was Removed from the Old Workflow

This V2 workflow intentionally moves away from the old setup-heavy model.

The following ideas are no longer the main workflow:
- manual street segmentation before filming
- route-first planning for every recording
- heavy manual checkpoint creation before field work
- heavy marker-by-marker manual review after upload

These can still exist later as optional or advanced tools, but they are no longer the foundation of the app.

---

# What the App Should Automate

The app should reduce work wherever possible.

It should aim to automate:
- generation of capture sessions from entries
- session ordering
- pairing readiness tracking
- GPS track parsing
- video + GPS sync support
- generation of searchable timeline entries
- suggested cut points
- search indexing for the client portal

The app should avoid forcing users to repeat the same information in multiple places.

---

# What the Team Still Must Do Manually

Even in this simpler workflow, some things still require human input:

- creating the client
- creating the project
- entering the recording targets in Capture Session Entries
- generating or reviewing the sessions
- recording the videos
- recording the GPX/FIT track
- uploading and pairing files
- reviewing the generated timeline entries
- publishing the final project

The app should reduce the work, but not pretend everything is automatic.

---

# Long-Term Direction

This V2 workflow is designed so the system can later support:

- extraction of GPS metadata directly from Insta360 files
- automatic place enrichment
- stronger address matching
- suggested visual landmark recognition
- optional cut/export workflows
- optional segmentation generated after recording instead of before recording

The system should stay lightweight now, but flexible later.

---

# Simple Summary

If someone asks how the app works, the short answer is:

1. Create the client
2. Create the project
3. Enter each road/range/frontage that needs to be recorded
4. Let the app generate the needed recording sessions
5. Record each session in the field
6. Upload the video and GPX/FIT file
7. Let the app build a searchable timeline
8. Review the timeline
9. Publish the project so the client can search by place instead of watching long videos blindly
