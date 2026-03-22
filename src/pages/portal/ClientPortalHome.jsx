import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { DocumentationPageIntro } from '@/components/ui/OperatingGuidance';
import { PAGE_GUIDANCE } from '@/lib/workflowGuidance';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, FolderOpen, MapPinned, Search } from 'lucide-react';

function summarizeProject(project) {
  return [
    project.client_portal_summary,
    project.client_visible_notes,
    project.project_limits_description,
    project.address_range_summary,
  ].filter(Boolean).join(' ');
}

export default function ClientPortalHome() {
  const [search, setSearch] = useState('');
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['portal-projects'],
    queryFn: () => base44.entities.Project.filter({ published_to_client: true }),
  });

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return projects;

    return projects.filter((project) => [
      project.project_name,
      project.project_code,
      project.municipality,
      project.county,
      project.state,
      summarizeProject(project),
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch));
  }, [projects, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project library"
        description="Search released project packages, then open a search-first viewer to find streets, addresses, ranges, and exact video moments."
      />
      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.client_portal_home.title, sections: PAGE_GUIDANCE.client_portal_home.sections }} />

      <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge variant="secondary" className="w-fit">Client portal</Badge>
              <h2 className="text-2xl font-semibold tracking-tight">Find the right project fast.</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Search by project name, municipality, scope notes, or address range summary to jump straight into the delivered library.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Published projects</p>
                <p className="mt-1 text-2xl font-semibold">{projects.length}</p>
              </div>
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Municipalities</p>
                <p className="mt-1 text-2xl font-semibold">{new Set(projects.map((project) => project.municipality).filter(Boolean)).size}</p>
              </div>
              <div className="rounded-xl border bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Search-ready viewer</p>
                <p className="mt-1 text-sm font-medium text-foreground">Addresses, roads, ranges, timestamps</p>
              </div>
            </div>
          </div>

          <div className="relative max-w-2xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-12 rounded-xl border-primary/20 pl-10 text-base"
              placeholder="Search project name, municipality, corridor, or address range"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filtered.length === 0 ? <EmptyState icon={FolderOpen} title="No published projects" description="Released project packages will appear here after CCG publishes them." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((project) => (
            <Link key={project.id} to={`/portal/projects/${project.id}`}>
              <Card className="h-full border-border/70 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{project.project_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{project.project_code || 'No project code listed'}</p>
                    </div>
                    <Badge variant="outline">Open viewer</Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-medium">Area</span>
                      </div>
                      <p className="mt-2 text-muted-foreground">{[project.municipality, project.county, project.state].filter(Boolean).join(', ') || 'No municipality listed'}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                      <div className="flex items-center gap-2 text-foreground">
                        <MapPinned className="h-4 w-4 text-primary" />
                        <span className="font-medium">Coverage</span>
                      </div>
                      <p className="mt-2 text-muted-foreground">{project.address_range_summary || project.project_limits_description || 'Open the viewer to browse released entries and sessions.'}</p>
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-muted-foreground">{summarizeProject(project) || 'Published project package.'}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
