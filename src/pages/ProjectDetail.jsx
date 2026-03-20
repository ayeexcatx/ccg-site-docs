import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import StatCard from '@/components/ui/StatCard';
import PermissionNotice from '@/components/ui/PermissionNotice';
import VisibilityBadge, { VISIBILITY_EXPLANATIONS } from '@/components/ui/VisibilityBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { OperatingGuide, QAReviewChecklist, VisibilityRulesPanel, WorkflowStepsPanel, InstructionPanel } from '@/components/ui/OperatingGuidance';
import { validateProjectReadiness, getVisibilityState } from '@/lib/base44Workflows';
import { usePageInstructions } from '@/hooks/usePageInstructions';
import { useUserProfile } from '@/lib/useUserProfile';
import { getRoleLabel } from '@/lib/roleUtils';
import { ArrowLeft, Bookmark, Camera, FileVideo, MapPin, ShieldCheck, Users } from 'lucide-react';

export default function ProjectDetail() {
  const projectId = window.location.pathname.split('/').pop();
  const { data: instructions = [] } = usePageInstructions('project_detail');
  const { profile, isDocumenter, isAdmin } = useUserProfile();

  const { data: projectResults = [] } = useQuery({ queryKey: ['project', projectId], queryFn: () => base44.entities.Project.filter({ id: projectId }) });
  const { data: segments = [] } = useQuery({ queryKey: ['segments', projectId], queryFn: () => base44.entities.StreetSegment.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: sessions = [] } = useQuery({ queryKey: ['sessions', projectId], queryFn: () => base44.entities.CaptureSession.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: media = [] } = useQuery({ queryKey: ['media', projectId], queryFn: () => base44.entities.MediaFile.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: markers = [] } = useQuery({ queryKey: ['markers', projectId], queryFn: () => base44.entities.MediaMarker.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: routes = [] } = useQuery({ queryKey: ['routes-by-project', projectId], queryFn: () => base44.entities.RoutePath.filter({ project_id: projectId }), enabled: !!projectId });
  const { data: accessAssignments = [] } = useQuery({ queryKey: ['project-access', projectId], queryFn: () => base44.entities.UserProfile.list('-created_date', 200), enabled: !!projectId });

  const project = projectResults[0];
  const readiness = useMemo(() => validateProjectReadiness({ project, segments, sessions, media, markers, routes }), [project, segments, sessions, media, markers, routes]);
  const mediaCounts = useMemo(() => media.reduce((accumulator, item) => { accumulator[item.media_type || 'unknown'] = (accumulator[item.media_type || 'unknown'] || 0) + 1; return accumulator; }, {}), [media]);
  const markerCounts = useMemo(() => markers.reduce((accumulator, item) => { accumulator[getVisibilityState(item) || 'unknown'] = (accumulator[getVisibilityState(item)] || 0) + 1; return accumulator; }, {}), [markers]);

  if (!project) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>;

  const scopedAssignments = accessAssignments.filter((user) => user.client_organization_id === project.client_organization_id || user.role === 'documenter' || user.role === 'company_admin' || user.role === 'super_admin');

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back to Projects</Link>
      <PageHeader title={project.project_name} description={`${project.project_code} · ${project.municipality || ''} ${project.state || ''}`}>
        <StatusBadge status={project.project_status} />
        <StatusBadge status={project.documentation_status} />
        {project.published_to_client && <StatusBadge status="published" />}
      </PageHeader>

      <PermissionNotice
        audience={[
          'Super Admin and Company Admin can manage project scope, QA, publish readiness, and access assignments.',
          'Documenters should use this page for scoped workflow awareness only and avoid client-facing promises.',
          'Client users do not access this company-side detail page; they use the client portal after publication.',
        ]}
        internalData="Operational blockers, internal notes, marker review maturity, assignment decisions, and incomplete workflow signals are internal to CCG."
        clientVisibleData="Client-visible notes, published media, and approved markers are curated separately and only surface in the portal once the project is published."
        publishingEffect="Publishing uses the checklist below as the operational gate. Client visibility should follow approved notes and publish flags, not raw workflow state."
        mistakesToAvoid="Do not publish because a project 'looks close.' Missing view types, incomplete sessions, draft client notes, or unreviewed markers will create avoidable client confusion."
      />

      <OperatingGuide
        title="Project Operations Guide"
        description="This page summarizes operational health across route planning, field sessions, media readiness, marker confidence, and publication state so staff can see what happens next."
        instructionCards={instructions}
        sections={[
          { heading: 'Purpose', body: 'Use this page to assess whether a project is still being prepared, actively documented, under review, or ready for client release.' },
          { heading: 'Who Uses This', body: 'Project managers, QA leads, reviewers, and client-facing coordinators should use this page to monitor readiness and identify blockers.' },
          { heading: 'When To Use It', body: 'Review this page during kickoff, before field deployment, during upload/review cycles, and before any client portal release.' },
          { heading: 'How It Works', body: 'Operational metrics aggregate the existing entity model: street segments define scope, route paths define coverage, sessions indicate field execution, media files indicate ingestion progress, and marker confidence indicates review maturity.' },
          { heading: 'Required Fields', body: 'Meaningful readiness depends on complete project metadata, routed segments, scheduled or completed sessions, uploaded media, and reviewed markers.' },
          { heading: 'QA / Review Checklist', body: 'Check route completeness, session completeness, upload readiness, review readiness, and publish readiness before promising availability to stakeholders.' },
          { heading: 'Client Visibility Rules', body: 'This page may summarize internal progress states that are not automatically client-facing. Publication should remain a deliberate action after internal checks pass.' },
          { heading: 'Related Next Steps', body: 'Use the linked operational pages to close gaps: build routes, finish field sessions, review markers, and then publish client-safe deliverables.' },
        ]}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Segments" value={segments.length} icon={MapPin} />
        <StatCard title="Sessions" value={sessions.length} icon={Camera} />
        <StatCard title="Media Files" value={media.length} icon={FileVideo} />
        <StatCard title="Markers" value={markers.length} icon={Bookmark} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Publish checklist</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {readiness.checklist.map((item) => (
              <div key={item.key} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Badge variant={item.ready ? 'default' : 'secondary'}>{item.ready ? 'Ready' : 'Not ready'}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2 leading-6">{item.reason}</p>
              </div>
            ))}
            {!readiness.publishReadiness && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Why this project is not ready to publish</p>
                <ul className="mt-2 list-disc pl-5 text-sm text-amber-900/80 space-y-1">
                  {readiness.blockers.map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Operational Readiness</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              ['Route completeness', readiness.routeCompleteness],
              ['Session completeness', readiness.sessionCompleteness],
            ].map(([label, value]) => (
              <div key={label} className="space-y-2"><div className="flex justify-between text-sm"><span>{label}</span><span>{value}%</span></div><Progress value={value} /></div>
            ))}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Uploads</p><Badge variant={readiness.uploadReadiness ? 'default' : 'secondary'}>{readiness.uploadReadiness ? 'Ready' : 'Pending'}</Badge></div>
              <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Review</p><Badge variant={readiness.reviewReadiness ? 'default' : 'secondary'}>{readiness.reviewReadiness ? 'Ready' : 'Needs QA'}</Badge></div>
              <div className="rounded-lg border p-3"><p className="text-xs uppercase tracking-wide text-muted-foreground">Publish</p><Badge variant={readiness.publishReadiness ? 'default' : 'secondary'}>{readiness.publishReadiness ? 'Ready' : 'Not ready'}</Badge></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Operational Counts</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-sm font-medium mb-2">Media by type</p><div className="flex flex-wrap gap-2">{Object.entries(mediaCounts).map(([type, count]) => <Badge key={type} variant="outline">{type}: {count}</Badge>)}{Object.keys(mediaCounts).length === 0 && <p className="text-sm text-muted-foreground">No media yet.</p>}</div></div>
            <div><p className="text-sm font-medium mb-2">Marker visibility mix</p><div className="flex flex-wrap gap-2">{Object.entries(markerCounts).map(([type, count]) => <div key={type} className="flex items-center gap-2"><VisibilityBadge visibility={type} /><span className="text-sm text-muted-foreground">{count}</span></div>)}{Object.keys(markerCounts).length === 0 && <p className="text-sm text-muted-foreground">No markers yet.</p>}</div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Project access review</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground leading-6">
              Use this assignment review to confirm who can invite, edit, review, or publish. Company-side roles can operate internally; client-side roles can review only the published package for their organization.
            </div>
            {scopedAssignments.slice(0, 8).map((user) => {
              const roleLabel = getRoleLabel(user.role);
              const isClientSide = ['client_manager', 'client_viewer'].includes(user.role);
              return (
                <div key={user.id} className="rounded-lg border p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel} · {user.email}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Badge variant="outline">{isClientSide ? 'Read' : 'Edit'}</Badge>
                    <Badge variant="outline">{user.role === 'client_manager' || isAdmin ? 'Invite' : 'No Invite'}</Badge>
                    <Badge variant="outline">{user.role === 'super_admin' || user.role === 'company_admin' ? 'Publish' : 'No Publish'}</Badge>
                    <Badge variant="outline">{isClientSide ? 'Client Review' : 'Internal Review'}</Badge>
                  </div>
                </div>
              );
            })}
            {scopedAssignments.length === 0 && <p className="text-sm text-muted-foreground">No matching assignments were found for this project scope.</p>}
            <p className="text-xs text-muted-foreground">Current viewer role: {getRoleLabel(profile?.role)}. {isDocumenter ? 'Documenters should stay within field and evidence workflows.' : 'Admins should verify publish and invite rights before portal release.'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WorkflowStepsPanel title="Operational Workflow" steps={[
          { title: 'Plan and route segments', description: 'Every segment should gain a route path and session plan before field execution begins.' },
          { title: 'Complete capture and upload', description: 'Sessions move the project toward upload readiness once media is ingested and tied back to the correct context.' },
          { title: 'Review, confirm, and publish', description: 'Markers and media must pass internal QA before publication is marked ready.' },
        ]} />
        <QAReviewChecklist items={[
          { title: 'Coverage checks', description: 'Compare the number of segments, routes, and sessions to identify missing operational scope.' },
          { title: 'Marker maturity', description: 'A project should not be considered review-ready if most markers are still estimated.' },
          { title: 'Client release discipline', description: 'Publish only after internal upload, review, and visibility checks are complete.' },
        ]} />
      </div>

      <VisibilityRulesPanel rules={[
        ...VISIBILITY_EXPLANATIONS.map((rule) => ({ title: rule.label, description: rule.description })),
        { title: 'Internal operations vs client release', description: 'A project can be operationally active without being client-ready. Publication should remain a separate control decision.' },
        { title: 'Notes and narratives', description: 'Only curated client-facing notes should appear outside internal review pages.' },
      ]} />
      <InstructionPanel instructions={instructions} />
    </div>
  );
}
