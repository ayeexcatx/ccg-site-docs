import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, FolderOpen, Camera, ClipboardList, Shield, FileVideo, Search, MessageSquare, BookOpen, ChevronLeft, ChevronRight, Eye, Clock3 } from 'lucide-react';
import { useUserProfile } from '@/lib/useUserProfile';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/lib/roleUtils';

const companyNavItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Clients', path: '/clients', icon: Building2, roles: ['super_admin', 'company_admin', 'client_manager'] },
  { label: 'Users', path: '/users', icon: Users, roles: ['super_admin', 'company_admin'] },
  { label: 'Projects', path: '/projects', icon: FolderOpen },
  { label: 'Capture Sessions', path: '/sessions', icon: Camera },
  { label: 'Session Entries', path: '/session-entries', icon: ClipboardList },
  { label: 'Field Session', path: '/field', icon: Shield },
  { label: 'Media Library', path: '/media', icon: FileVideo },
  { label: 'Timeline Review', path: '/timeline-review', icon: Clock3 },
  { label: 'Review Cases', path: '/reviews', icon: MessageSquare, roles: ['super_admin', 'company_admin', 'client_manager'] },
  { label: 'System Instructions', path: '/instructions', icon: BookOpen, roles: ['super_admin', 'company_admin'] },
];

const clientNavItems = [
  { label: 'Portal Home', path: '/', icon: LayoutDashboard },
  { label: 'My Projects', path: '/portal/projects', icon: Search },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isClientUser, profile } = useUserProfile();
  const navItems = (isClientUser ? clientNavItems : companyNavItems).filter((item) => !item.roles || item.roles.includes(profile?.role));

  return (
    <aside className={cn('flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300', collapsed ? 'w-16' : 'w-60')}>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
          <Eye className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && <div className="overflow-hidden"><p className="truncate text-sm font-bold">CCG Site Docs</p><p className="truncate text-[10px] text-sidebar-foreground/60">Documentation Portal v2</p></div>}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link key={item.path} to={item.path} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground')}>
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 border-t border-sidebar-border p-2">
        {!collapsed && profile && <div className="mb-1 px-3 py-2"><p className="truncate text-xs font-medium">{profile.full_name}</p><p className="truncate text-[10px] text-sidebar-foreground/60">{getRoleLabel(profile.role)}</p></div>}
        <button onClick={() => setCollapsed(!collapsed)} className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
