# Workflow Architecture Audit Summary

## What changed

This audit consolidated workflow logic so each layer has a clearer responsibility:

- **UI pages/components** render controls, explanatory guides, QA checklists, and visibility panels.
- **Domain workflow helpers** in `src/lib/domainWorkflows.js` now own the workflow-specific business rules used by multiple pages.
- **Base44 workflow adapters** in `src/lib/base44Workflows.js` focus on persistence and scoped data loading.
- **Display helpers** in `src/lib/displayUtils.js` and `src/lib/roleUtils.js` format status/labels and enforce coarse role/path rules.

## Final workflow logic locations

### UI layer
- `src/pages/RouteEditor.jsx`
- `src/pages/FieldSession.jsx`
- `src/pages/MarkerReview.jsx`
- `src/pages/ProjectDetail.jsx`
- `src/pages/portal/ClientProjectViewer.jsx`

These pages now depend on shared helpers for workflow state derivation instead of rebuilding the same logic inline.

### Domain/workflow helpers
- `getRouteValidationWarnings` keeps route completeness and warning rules in one place.
- `getProjectDetailSummary` centralizes project readiness cards and operational count summaries.
- `getFieldSessionViewModel` centralizes field-session event-card derivation.
- `getClientProjectViewerModel` centralizes client-safe filtering, search, grouping, and segment/media/marker view state.
- `getMarkerReviewSummary`, `getProjectReadinessSummary`, `getFieldSessionSummary`, `getRoutePathSummary`, and `getVisibilityLabelForRecord` remain the shared workflow foundation.

### Base44 adapters
- `saveDrawnRoutePath`, `addRouteCheckpoint`, `reorderRouteCheckpoints`, `logFieldSessionEvent`, and `loadSystemInstructionsForPage` remain adapter functions because they translate domain intent into Base44 entity reads/writes.
- The redundant `getVisibilityState` wrapper was removed so visibility rules now come directly from the domain helper instead of existing in both adapter and domain layers.

### Display and role helpers
- `displayUtils.js` is now strictly for text/time formatting helpers.
- `roleUtils.js` remains responsible for role labels, capabilities, and route-level access boundaries.

## Drift and duplication addressed

- Removed duplicated route warning logic from `RouteEditor`.
- Removed duplicated project-detail readiness card/count derivation from `ProjectDetail`.
- Removed duplicated client-portal filtering/grouping logic from `ClientProjectViewer`.
- Removed redundant visibility helper overlap between `base44Workflows.js` and `domainWorkflows.js`.
- Kept explanatory operating guides, visibility guidance, QA checklists, and workflow explanation panels intact.

## Maintenance guidance

When adding new workflow behavior:

1. Put **Base44 entity reads/writes** in `src/lib/base44Workflows.js`.
2. Put **cross-page workflow/business rules** in `src/lib/domainWorkflows.js`.
3. Put **formatting-only helpers** in `src/lib/displayUtils.js`.
4. Keep pages focused on **rendering and user interaction orchestration**.
5. Preserve the explanatory guidance panels so workflow changes remain legible to operators and reviewers.
