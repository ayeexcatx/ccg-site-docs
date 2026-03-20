import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import StatCard from '@/components/ui/StatCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FolderOpen, MapPin, Search, ArrowRight, Eye } from 'lucide-react';
import { useState } from 'react';

export default function ClientPortalHome() {
  const [search, setSearch] = useState('');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['portal-projects'],
    queryFn: () => base44.entities.Project.filter({ published_to_client: true }),
  });

  const filtered = projects.filter(p =>
    p.project_name?.toLowerCase().includes(search.toLowerCase()) || p.municipality?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Eye className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold">CCG Documentation Portal</h1>
          <p className="text-sm text-muted-foreground">Pre-Construction Site Documentation</p>
        </div>
      </div>

      <PageHeader title="Your Projects" description="Browse published pre-construction documentation for your projects. Search by project name, street, or municipality." />

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search projects, streets, or locations..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No published projects" description="Your project documentation will appear here once it has been published by the CCG team." />
      ) : (
        <div className="grid gap-4">
          {filtered.map(p => (
            <Link key={p.id} to={`/portal/projects/${p.id}`}>
              <Card className="hover:shadow-md transition-all hover:border-primary/30 cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{p.project_name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{p.municipality} {p.county ? `, ${p.county}` : ''} {p.state || ''}</p>
                      {p.client_visible_notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.client_visible_notes}</p>}
                      {p.client_portal_summary && <p className="text-xs text-muted-foreground mt-1">{p.client_portal_summary}</p>}
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}