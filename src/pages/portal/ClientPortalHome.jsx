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
import { FolderOpen, Search } from 'lucide-react';

export default function ClientPortalHome() {
  const [search, setSearch] = useState('');
  const { data: projects = [], isLoading } = useQuery({ queryKey: ['portal-projects'], queryFn: () => base44.entities.Project.filter({ published_to_client: true }) });
  const filtered = useMemo(() => projects.filter((project) => [project.project_name, project.municipality, project.client_portal_summary].filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())), [projects, search]);

  return (
    <div className="space-y-6">
      <PageHeader title="Your Projects" description="Browse published CCG project packages and open the searchable project viewer." />
      <DocumentationPageIntro guide={{ title: PAGE_GUIDANCE.client_portal_home.title, sections: PAGE_GUIDANCE.client_portal_home.sections }} />
      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search projects or municipalities" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {isLoading ? <div className="flex justify-center py-12"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" /></div> : filtered.length === 0 ? <EmptyState icon={FolderOpen} title="No published projects" description="Your released project packages will appear here after CCG publishes them." /> : (
        <div className="grid gap-4">
          {filtered.map((project) => <Link key={project.id} to={`/portal/projects/${project.id}`}><Card className="hover:border-primary/30 hover:shadow-md"><CardContent className="p-5"><p className="text-base font-semibold">{project.project_name}</p><p className="mt-1 text-sm text-muted-foreground">{project.municipality || 'No municipality listed'}</p><p className="mt-2 text-sm text-muted-foreground">{project.client_portal_summary || project.client_visible_notes || 'Published project package.'}</p></CardContent></Card></Link>)}
        </div>
      )}
    </div>
  );
}
