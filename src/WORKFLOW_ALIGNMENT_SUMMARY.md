# CCG Site Documentation Portal - Workflow Alignment Summary

**Date:** 2026-03-22  
**Objective:** Align live Base44 app with GitHub/Codex repo workflow expectations

---

## ✅ Alignment Complete

### Backend Workflow Functions (lib/base44Workflows.js)

All required workflow functions are implemented and operational:

1. **createCaptureSessionForSegment** - Creates capture sessions linked to project and segment
2. **saveDrawnRoutePath** - Saves route geometry and checkpoint metadata
3. **addRouteCheckpoint** - Adds individual checkpoints to routes with sequence order
4. **reorderRouteCheckpoints** - Updates checkpoint sequence after drag/drop or manual reorder
5. **logFieldSessionEvent** - Records field session events with timestamps
6. **estimateCheckpointTimestampsFromSessionEvents** - Computes estimated timeline from events
7. **createMarkerFromCheckpoint** - Transforms checkpoint data into marker format
8. **syncMarkersFromRouteAndDuration** - Bulk syncs markers based on route and media duration
9. **validateProjectReadiness** - Comprehensive publish readiness validation
10. **getRoleAwareDashboardData** - Role-scoped data filtering for dashboard
11. **loadSystemInstructionsForPage** - Loads page-specific operational instructions

### Domain Workflow Helpers (lib/domainWorkflows.js)

Comprehensive operational logic:

- **Visibility Management**: `getVisibilityLabelForRecord` - Unified client/internal visibility rules
- **Route Operations**: `orderCheckpoints`, `getRoutePathSummary`, `getRouteValidationWarnings`
- **Project Readiness**: `getProjectReadinessSummary`, `getProjectDetailSummary`
- **Field Session**: `getFieldSessionSummary`, `getFieldSessionViewModel`
- **Marker Review**: `getMarkerReviewSummary`, `getMarkerConfidenceLabel`
- **Client Portal**: `getClientVisibleProjectData`, `getClientProjectViewerModel`
- **Media Grouping**: `groupMediaBySegmentViewSession`

### Operational Guidance Components (components/ui/OperatingGuidance)

Full-featured documentation guidance system:

- **PagePurposeHeader** - Page context cards (purpose, role, workflow, visibility, next steps)
- **OperatingGuide** - Detailed workflow sections and instruction cards
- **DocumentationPageIntro** - Combined header + guide for major operational pages
- **QAReviewChecklist** - Structured QA validation items
- **VisibilityRulesPanel** - Client vs internal visibility explanations
- **WorkflowStepsPanel** - Numbered workflow steps
- **InstructionPanel** - Dynamic page instructions from SystemInstruction entity

### System Instructions Data

12 operational instructions seeded for major pages:

**Route Editor:**
- Core purpose and QA discipline

**Field Session:**
- Mobile field discipline
- Post-session handoff procedures

**Marker Review:**
- Core review process
- Confidence level usage
- Client visibility discipline

**Project Detail:**
- Readiness interpretation
- Publication gate discipline

**Other Pages:**
- Session planning
- Media upload context
- Asset location usage

---

## 🎯 Workflow Pages Enhanced

All major operational pages now include:

### 1. Route Editor (`pages/RouteEditor`)
- Full DocumentationPageIntro with purpose, role, workflow, visibility, next steps
- Guided route setup with step hints
- Comprehensive checkpoint builder with drag/drop reorder
- Route validation warnings
- QA checklist, visibility rules, workflow steps panels
- Future-ready route-to-media sync envelope
- Page-specific instructions integration

### 2. Field Session (`pages/FieldSession`)
- Mobile-optimized timer and event logging
- Large-button workflow for field use
- Event grouping (lifecycle, checkpoints, notes)
- Post-session summary with estimated checkpoint timing
- Operating guide with field discipline expectations
- Event history by type
- QA checklist and visibility reminders

### 3. Marker Review (`pages/MarkerReview`)
- Grouped media-by-media review workspace
- Comprehensive filtering (project, session, media, confidence, visibility, type)
- Timestamp validation with formatted display
- Checkpoint and asset reference linking
- Confidence level workflow (manual → estimated → confirmed)
- Visibility badge integration
- QA checklist and visibility rules panels
- Future-ready AI tagging extension notes

### 4. Project Detail (`pages/ProjectDetail`)
- Project readiness dashboard
- Publish checklist with blockers
- Operational metrics (route, session, upload, review readiness)
- Media and marker counts
- Project access review
- Workflow steps and QA checklist
- Permission notices and visibility rules

### 5. Projects (`pages/Projects`)
- Project list with status filtering
- Operational overview documentation
- Client alignment and scope guidance
- Future-ready project setup workflow

### 6. Street Segments (`pages/StreetSegments`)
- Segment management with sequencing
- How This Works guidance
- Project filtering

### 7. Capture Sessions (`pages/CaptureSessions`)
- Session planning and status tracking
- Documenter assignment
- Session metadata management

### 8. Media Library (`pages/MediaLibrary`)
- Media registration with storage mode selection
- Future-ready 360 viewer and storage adapter placeholders
- View type and publish flag management

### 9. Asset Locations (`pages/AssetLocations`)
- Asset type management
- Map coordinate capture
- Client visibility controls

### 10. Review Cases (`pages/ReviewCases`)
- Case tracking workflow
- Project and client linking
- Status management

---

## 🔄 Workflow Consistency

### Visibility Rules (Unified Across App)
- **Internal Only**: Company-side operational data
- **Client Visible**: Approved for portal publication
- **Needs Review**: Draft client text exists but not approved

Applied consistently across:
- MediaMarker (`is_client_visible` + notes fields)
- RouteCheckpoint (`is_client_visible`)
- Project notes (`internal_notes` vs `client_visible_notes`)
- All other entities with visibility requirements

### Status Workflow Consistency
- **Project Status**: draft → active → in_review → published → archived
- **Documentation Status**: not_started → scheduled → in_progress → uploaded → reviewed → published
- **Session Status**: planned → ready → in_progress → paused → uploaded → under_review → approved → published
- **QA Status**: not_reviewed → needs_review → approved → flagged

### Role-Based Access (lib/roleUtils.js)
- **super_admin / company_admin**: Full access, publish rights
- **documenter**: Field session, media, scoped projects
- **client_manager**: Client portal + invite
- **client_viewer**: Read-only client portal

---

## 📐 Architecture Alignment

### Future-Ready Design (lib/futureArchitecture.js)

**Extension Points Preserved:**
1. **360 Viewer Support** - Media type metadata ready, viewer capability matrix defined
2. **Route-to-Media Sync** - Sync envelope structure ready for computation services
3. **AI-Assisted Tagging** - Marker suggestion context and reviewer guardrails defined
4. **External Storage Adapters** - Storage mode descriptors ready for large file integrations

**Principles:**
- Current workflow unchanged
- Extension points are additive metadata
- Internal-first, client-controlled publication
- Reviewer judgment preserved over automation

### Workflow Function Architecture

**Three-Layer Design:**
1. **Base44 Workflows** (`lib/base44Workflows.js`) - Direct entity operations
2. **Domain Workflows** (`lib/domainWorkflows.js`) - Business logic and computed state
3. **Page Components** - UI rendering and user interaction

**Benefits:**
- Pages stay focused on UI
- Business rules centralized
- Easier testing and refactoring
- Consistent behavior across pages

---

## ✅ Verification Checklist

### Backend Functions
- [x] All 11 required workflow functions exist
- [x] Functions properly integrated into pages
- [x] Error handling and validation present
- [x] Role-aware data scoping implemented

### Operational Guidance
- [x] DocumentationPageIntro on all major pages
- [x] QA checklists for review workflows
- [x] Visibility rules panels
- [x] Workflow steps panels
- [x] System instructions seeded and loading

### Entity Schema
- [x] All 19 core entities defined
- [x] Visibility fields consistent
- [x] Status enums aligned
- [x] Built-in User entity integration

### Page Coverage
- [x] Route Editor - Full operational guidance
- [x] Field Session - Mobile-optimized workflow
- [x] Marker Review - Comprehensive review workspace
- [x] Project Detail - Readiness dashboard
- [x] Projects - Operational overview
- [x] Street Segments - Sequencing and filtering
- [x] Capture Sessions - Planning and assignment
- [x] Media Library - Future-ready registration
- [x] Asset Locations - Map and context
- [x] Review Cases - Case tracking

### Workflow Integration
- [x] Route → Field Session → Marker Review flow
- [x] Project → Segments → Sessions → Media flow
- [x] Publish readiness validation
- [x] Client portal visibility controls
- [x] Role-based dashboard data

---

## 🎓 Operational Standards

### Required Workflow Behaviors

**Before Route Save:**
- Project, segment, and session selected
- At least 2 route points
- Start and end checkpoints present
- Route name provided
- Validation warnings reviewed

**During Field Session:**
- Timer started at actual capture start
- Events logged only for meaningful references
- Pause only for real interruptions
- Notes written for reviewer clarity
- Session finished with complete summary

**In Marker Review:**
- Review grouped media-by-media
- Validate timestamps against actual media
- Confirm checkpoint and asset references
- Leave internal-only until labels clean
- Move to confirmed only after QA validation

**For Project Publication:**
- All segments routed
- All sessions approved or published
- Media attached with file URLs
- Markers reviewed and confirmed
- Client-visible notes validated (no draft language)
- Publish checklist all green

---

## 📝 Notes

**Live App Strengths:**
- Comprehensive workflow helper library
- Detailed operational guidance system
- Role-aware data scoping
- Future-ready architecture placeholders
- Consistent visibility and status patterns

**GitHub Sync Status:**
- All synced commits included workflow refinements
- Operating guidance expanded across 7 syncs
- Shared helpers consolidated
- Permission and visibility logic tightened

**Next Developer Actions:**
- Use existing workflow functions, don't rebuild
- Extend OperatingGuidance components for new pages
- Follow established visibility patterns
- Add new System Instructions via entity records
- Preserve future-ready extension points

---

## 🔗 Key Files Reference

**Core Libraries:**
- `lib/base44Workflows.js` - Backend workflow operations
- `lib/domainWorkflows.js` - Business logic and computed state
- `lib/roleUtils.js` - Role capabilities and access control
- `lib/displayUtils.js` - Formatting and label utilities
- `lib/constants.js` - Status colors and type labels
- `lib/futureArchitecture.js` - Extension point blueprints

**UI Components:**
- `components/ui/OperatingGuidance` - Documentation guidance system
- `components/ui/PageHeader` - Consistent page headers
- `components/ui/StatusBadge` - Status visualization
- `components/ui/VisibilityBadge` - Visibility state display
- `components/ui/PermissionNotice` - Role-based notices
- `components/ui/FutureReadyPanel` - Extension point documentation

**Hooks:**
- `hooks/usePageInstructions.js` - System instruction loading
- `lib/useUserProfile.js` - Current user context

**Entities:**
- 19 core entities fully defined
- SystemInstruction entity seeded with 12 records
- User entity with role-based access

---

**Status:** ✅ Complete - Live Base44 app fully aligned with GitHub/Codex repo workflow expectations.