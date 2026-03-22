import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatLabel, formatTimestamp } from '@/lib/displayUtils';
import { ArrowLeft, Clock3, ExternalLink, FileVideo, Library, ListFilter, MapPinned, PlayCircle, Search, Waypoints } from 'lucide-react';

function buildSearchableLocation(item) {
  return [
    item.nearest_address,
    item.nearest_intersection,
    item.nearest_road,
    item.address_range,
    item.nearby_place_name,
  ].filter(Boolean).join(' · ');
}

function buildRoadRangeLabel(item) {
  return [item.nearest_road, item.address_range].filter(Boolean).join(' · ') || item.nearest_intersection || 'Location match';
}

function entryCoverage(entry) {
  const segments = [];
  if (entry.street_name) segments.push(entry.street_name);
  if (entry.from_location || entry.to_location) segments.push(`${entry.from_location || '?'} to ${entry.to_location || '?'}`);
  if (entry.address_range_start || entry.address_range_end) segments.push(`${entry.address_range_start || '?'} to ${entry.address_range_end || '?'}`);
  return segments.join(' · ') || entry.notes || 'Coverage details not listed';
}

function openVideoAtTimestamp(url, seconds) {
  if (!url) return;
  const safeSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
  const separator = url.includes('?') ? '&' : '?';
  const target = safeSeconds > 0 ? `${url}${separator}t=${safeSeconds}` : url;
  window.open(target, '_blank', 'noopener,noreferrer');
}

export default function ClientProjectViewer() {
  const { id: projectId } = useParams();
  const [search, setSearch] = useState('');

  const { data: projectResults = [] } = useQuery({
    queryKey: ['portal-project', projectId],
    queryFn: () => base44.entities.Project.filter({ id: projectId }),
    enabled: !!projectId,
  });
  const { data: mediaFiles = [] } = useQuery({
    queryKey: ['portal-media', projectId],
    queryFn: () => base44.entities.MediaFile.filter({ project_id: projectId, publish_to_client: true }),
    enabled: !!projectId,
  });
  const { data: timelineItems = [] } = useQuery({
    queryKey: ['portal-timeline', projectId],
    queryFn: () => base44.entities.TimelineIndexEntry.filter({ project_id: projectId, client_visible: true }),
    enabled: !!projectId,
  });
  const { data: entries = [] } = useQuery({
    queryKey: ['portal-entries', projectId],
    queryFn: () => base44.entities.CaptureSessionEntry.filter({ project_id: projectId }),
    enabled: !!projectId,
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['portal-sessions', projectId],
    queryFn: () => base44.entities.CaptureSession.filter({ project_id: projectId }),
    enabled: !!projectId,
  });

  const project = projectResults[0];

  const mediaById = useMemo(() => Object.fromEntries(mediaFiles.map((file) => [file.id, file])), [mediaFiles]);
  const sessionsById = useMemo(() => Object.fromEntries(sessions.map((session) => [session.id, session])), [sessions]);
  const sessionsByEntryId = useMemo(() => sessions.reduce((accumulator, session) => {
    if (!session.capture_session_entry_id) return accumulator;
    accumulator[session.capture_session_entry_id] = accumulator[session.capture_session_entry_id] || [];
    accumulator[session.capture_session_entry_id].push(session);
    return accumulator;
  }, {}), [sessions]);

  const normalizedSearch = search.trim().toLowerCase();

  const enrichedTimeline = useMemo(() => timelineItems.map((item) => {
    const media = mediaById[item.media_file_id];
    const session = sessionsById[item.capture_session_id];
    return {
      ...item,
      media,
      session,
      searchableLocation: buildSearchableLocation(item),
      roadRangeLabel: buildRoadRangeLabel(item),
    };
  }), [timelineItems, mediaById, sessionsById]);

  const searchResults = useMemo(() => {
    if (!normalizedSearch) return enrichedTimeline.slice(0, 24);
    return enrichedTimeline.filter((item) => [
      item.searchableLocation,
      item.roadRangeLabel,
      item.search_text,
      item.search_keywords,
      item.media?.media_title_override_for_client,
      item.media?.media_title,
      item.session?.session_name,
      item.session?.session_area_description,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch));
  }, [enrichedTimeline, normalizedSearch]);

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    if (!normalizedSearch) return true;
    return [
      entry.entry_name,
      entry.street_name,
      entry.from_location,
      entry.to_location,
      entry.address_range_start,
      entry.address_range_end,
      entry.municipality,
      entry.notes,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);
  }), [entries, normalizedSearch]);

  const filteredSessions = useMemo(() => sessions.filter((session) => {
    if (!normalizedSearch) return true;
    const media = mediaFiles.find((file) => file.capture_session_id === session.id);
    return [
      session.session_name,
      session.session_code,
      session.session_area_description,
      session.field_notes_client_visible,
      media?.media_title,
      media?.media_title_override_for_client,
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch);
  }), [sessions, normalizedSearch, mediaFiles]);

  if (!project) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div>;

  return (
    <div className="space-y-6">
      <Link to="/portal/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to projects</Link>
      <PageHeader title={project.project_name} description={project.client_portal_summary || 'Search the released videos and browse the published project library.'} />
      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.client_project_viewer.title, sections: PAGE_GUIDANCE.client_project_viewer.sections }} />

      <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2 max-w-3xl">
              <Badge variant="secondary" className="w-fit">Search-first viewer</Badge>
              <h2 className="text-2xl font-semibold tracking-tight">Search by address, intersection, road, range, or place.</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Results show the matching session or video, the best timestamp, the road or range label, and location text so you can jump directly to the right moment.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[460px]">
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Searchable moments</p>
                <p className="mt-1 text-2xl font-semibold">{enrichedTimeline.length}</p>
              </div>
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Recording entries</p>
                <p className="mt-1 text-2xl font-semibold">{entries.length}</p>
              </div>
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Released videos</p>
                <p className="mt-1 text-2xl font-semibold">{mediaFiles.length}</p>
              </div>
            </div>
          </div>

          <div className="relative max-w-4xl">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 rounded-xl border-primary/20 pl-11 text-base"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Try: 123 Main St, Main & Elm, Robert Street, 100-200 block, library"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="search" className="gap-2"><Search className="h-4 w-4" /> Search results</TabsTrigger>
          <TabsTrigger value="browse" className="gap-2"><Library className="h-4 w-4" /> Browse library</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          {searchResults.length === 0 ? <EmptyState icon={Search} title="No matching indexed moments" description="Try another road name, address, intersection, range, or landmark." /> : (
            <div className="grid gap-4">
              {searchResults.map((item) => {
                const title = item.media?.media_title_override_for_client || item.media?.media_title || item.session?.session_name || 'Released session';
                const notes = item.search_text || item.session?.field_notes_client_visible || item.media?.client_visible_notes || 'Indexed location match.';
                const canOpenVideo = !!item.media?.file_url;
                return (
                  <Card key={item.id} className="border-border/70 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{item.roadRangeLabel}</Badge>
                            <Badge variant="outline">{formatTimestamp(item.start_seconds)}</Badge>
                            {item.session?.default_view_type && <Badge variant="outline">{formatLabel(item.session.default_view_type)}</Badge>}
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-foreground">{title}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{notes}</p>
                          </div>
                          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-xl border bg-muted/20 p-3">
                              <p className="mb-1 flex items-center gap-2 font-medium text-foreground"><Clock3 className="h-4 w-4 text-primary" /> Timestamp</p>
                              <p>{formatTimestamp(item.start_seconds)}{item.end_seconds ? ` to ${formatTimestamp(item.end_seconds)}` : ''}</p>
                            </div>
                            <div className="rounded-xl border bg-muted/20 p-3">
                              <p className="mb-1 flex items-center gap-2 font-medium text-foreground"><Waypoints className="h-4 w-4 text-primary" /> Session / video</p>
                              <p>{item.session?.session_name || title}</p>
                            </div>
                            <div className="rounded-xl border bg-muted/20 p-3">
                              <p className="mb-1 flex items-center gap-2 font-medium text-foreground"><ListFilter className="h-4 w-4 text-primary" /> Road / range</p>
                              <p>{item.roadRangeLabel}</p>
                            </div>
                            <div className="rounded-xl border bg-muted/20 p-3">
                              <p className="mb-1 flex items-center gap-2 font-medium text-foreground"><MapPinned className="h-4 w-4 text-primary" /> Location text</p>
                              <p>{item.searchableLocation || 'Location text not available'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 lg:w-[190px]">
                          <Button className="gap-2" disabled={!canOpenVideo} onClick={() => openVideoAtTimestamp(item.media?.file_url, item.start_seconds)}>
                            <PlayCircle className="h-4 w-4" /> Jump to moment
                          </Button>
                          <Button variant="outline" className="gap-2" disabled={!canOpenVideo} onClick={() => openVideoAtTimestamp(item.media?.file_url)}>
                            <ExternalLink className="h-4 w-4" /> Open full video
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="browse" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader>
                <CardTitle>Recording entries index</CardTitle>
                <CardDescription>Browse every released road, range, frontage, or related entry for this project.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredEntries.length === 0 ? <EmptyState icon={Library} title="No entries match this search" description="Try another road name, range, or place keyword." /> : filteredEntries.map((entry) => {
                  const relatedSessions = sessionsByEntryId[entry.id] || [];
                  return (
                    <div key={entry.id} className="rounded-xl border p-4 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-foreground">{entry.entry_name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{formatLabel(entry.entry_type)} · {entry.municipality || project.municipality || 'Municipality not listed'}</p>
                        </div>
                        <Badge variant="outline">{relatedSessions.length} related session{relatedSessions.length === 1 ? '' : 's'}</Badge>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{entryCoverage(entry)}</p>
                      <div className="flex flex-wrap gap-2">
                        {relatedSessions.length === 0 ? <Badge variant="secondary">No related sessions published yet</Badge> : relatedSessions.map((session) => <Badge key={session.id} variant="secondary">{session.session_name}</Badge>)}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sessions and videos</CardTitle>
                <CardDescription>Open the full released video from a session whenever it is available.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredSessions.length === 0 ? <EmptyState icon={FileVideo} title="No sessions match this search" description="Try a different session name, road, or video title." /> : filteredSessions.map((session) => {
                  const media = mediaFiles.find((file) => file.capture_session_id === session.id);
                  const title = media?.media_title_override_for_client || media?.media_title || session.session_name;
                  return (
                    <div key={session.id} className="rounded-xl border p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-foreground">{title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{session.session_name}</p>
                        </div>
                        {session.default_view_type && <Badge variant="outline">{formatLabel(session.default_view_type)}</Badge>}
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{session.session_area_description || media?.client_visible_notes || 'Session coverage summary not listed.'}</p>
                      <div className="flex flex-wrap gap-2">
                        {session.session_code && <Badge variant="secondary">{session.session_code}</Badge>}
                        {session.capture_date && <Badge variant="secondary">{session.capture_date}</Badge>}
                        {media?.duration_seconds ? <Badge variant="secondary">{formatTimestamp(media.duration_seconds)} total</Badge> : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" className="gap-2" disabled={!media?.file_url} onClick={() => openVideoAtTimestamp(media?.file_url)}>
                          <ExternalLink className="h-4 w-4" /> Open full video
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
