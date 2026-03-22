# CCG V2 Workflow

## What this app is for

CCG uses this app to organize, capture, review, and deliver site documentation for a client project.

In plain terms, the app helps the team:

- define what areas need to be recorded
- turn that scope into recordable field sessions
- connect each video to a GPS track
- turn long recordings into searchable timeline moments
- publish a cleaner client portal experience

The rebuilt app is designed to reduce unnecessary setup work before field capture and reduce avoidable manual review work after upload.

## The new session-first workflow

The rebuilt app starts with the recording session, not with map segments.

The workflow is:

1. Create the client.
2. Create the project.
3. Add capture session entries.
4. Generate the capture sessions.
5. Record those sessions in the field.
6. Upload the video and the GPX/FIT track.
7. Pair the media and track to the same session.
8. Build timeline index entries from that pairing.
9. Review the results.
10. Publish client-safe search and media access in the portal.

That is the main operating model the documentation, pages, and future automation should support.

## What a capture session entry is

A **capture session entry** is the planning item that says what needs to be documented.

It is usually a road, range, frontage, intersection area, or another clearly named recording target.

Examples:

- Main Street from Oak Ave to Elm Ave
- 100-300 block Robert Street
- Library frontage
- Curb ramp range A-F

A capture session entry is **not** the video file and **not** the field recording itself.

It is the definition of the work that still needs to happen.

## What a capture session is

A **capture session** is the actual recording task created from an entry.

If one entry needs multiple views, the system can generate multiple capture sessions from that one entry.

Examples:

- Main Street — Right Profile
- Main Street — Left Profile
- Main Street — Curb Line / Edge of Pavement
- Main Street — Cross Section
- Main Street — 360 Walk

Each capture session should represent one real recording pass or one clearly defined recording task.

## How field sessions work

The **Field Session** page is for the real-world recording run.

During a field session, the documenter should:

1. open the correct generated capture session
2. start the session when the camera and GPS device start together
3. record the run
4. add only light notes if something unusual happens
5. complete the handoff when the run ends

This page is not meant for heavy manual checkpoint logging.

The rebuilt app assumes the main location intelligence should come from the paired GPS track, not from constant button pressing during capture.

Field notes are still useful, but only for exceptions such as:

- a blocked lane or detour
- a pause in recording
- an important landmark or issue worth checking later
- anything the automatic timeline output may misunderstand

## How GPX/FIT pairing works

The rebuilt app expects the crew to record a GPS track alongside the video whenever GPS is required for that session.

That usually means:

- start the camera
- start the GPX or FIT recording at the same time
- upload both files after the session
- pair both files to the same capture session

The pair matters because the video explains **what** the camera saw, while the GPX/FIT file helps explain **where** the camera was during each part of the recording.

Once paired, the system can build time-based location references for the recording.

## How timeline indexing works

**Timeline indexing** turns a long recording into smaller searchable moments.

A timeline index entry can store information such as:

- start time and end time in the video
- nearest road
- nearest intersection
- nearest address or address range
- nearby place name
- search text and keywords

This is what makes a long video useful later.

Instead of asking someone to scrub through a 20-minute or 40-minute recording manually, the app should create indexed moments that help reviewers and clients jump to the right part quickly.

## How the client portal search works

The client portal is now meant to be **search-first**.

A client should be able to search using normal location language such as:

- an address
- an intersection
- a street name
- an address range
- a nearby place or landmark

The portal should return the matching indexed timeline moments first, along with the related session or video, timestamp, and location text.

If the exact moment is not found, the client should still be able to browse the released recordings for that project.

## What was removed from the old workflow

The rebuilt direction removes or demotes several older ideas from the main workflow.

These include:

- segment-first planning as the main starting point
- route drawing as the main required setup step
- constant manual checkpoint logging during field capture
- relying on manual marker building as the main way to make recordings searchable
- treating browse-only media delivery as the main client experience

Some older pages or concepts may still exist in the repo, but they should not be treated as the primary operating model for the rebuilt app.

## What the app should automate

The app should automate as much of the routine workflow as possible.

That includes:

- generating capture sessions from capture session entries
- tracking session status through recording, upload, pairing, indexing, and review
- connecting uploaded media to the correct session
- connecting GPX/FIT tracks to the correct session
- building draft timeline index entries from media + GPS pairing
- creating search text that helps the client portal return useful matches
- suggesting cut points for long recordings when helpful
- showing clear readiness states so staff know what step is blocked next

## What still requires human review

Even in the rebuilt workflow, some work still needs a person to confirm it.

Human review is still needed for:

- whether the correct road, frontage, or range was set up in the first place
- whether the correct generated session was recorded
- whether the uploaded video and GPX/FIT file were paired correctly
- whether timeline location matches are accurate enough to release
- whether client-visible notes are clean and understandable
- whether any suggested cut points are actually useful
- whether the final portal package is complete and client-safe

In short: the app should automate the repetitive parts, but people should still review anything that affects accuracy, release quality, or client trust.

## Practical summary

The rebuilt CCG workflow is:

- plan by entry
- generate sessions
- record in the field
- pair video and GPS track
- index the timeline
- review the results
- publish searchable client delivery

That is the clearest way to understand the current direction of the app.
