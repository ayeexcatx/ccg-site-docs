import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, FolderOpen, MapPin, Camera, Route, 
  FileVideo, Bookmark, MapPinned, MessageSquare, BookOpen,
  ChevronLeft, ChevronRight, Shield, Eye
} from 'lucide-react';
import { useUserProfile } from '@/lib/useUserProfile';
import { cn } from '@/lib/utils';
import { getRoleLabel } from '@/lib/roleUtils';

const companyNavItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Clients', path: '/clients', icon: Building2, roles: ['super_admin', 'company_admin', 'client_manager'] },
  { label: 'Users', path: '/users', icon: Users, roles: ['super_admin', 'company_admin'] },
  { label: 'Projects', path: '/projects', icon: FolderOpen },
  { label: 'Street Segments', path: '/segments', icon: MapPin, roles: ['super_admin', 'company_admin'] },
  { label: 'Capture Sessions', path: '/sessions', icon: Camera },
  { label: 'Route Editor', path: '/routes', icon: Route, roles: ['super_admin', 'company_admin'] },
  { label: 'Field Session', path: '/field', icon: Shield },
  { label: 'Media Library', path: '/media', icon: FileVideo },
  { label: 'Marker Review', path: '/markers', icon: Bookmark },
  { label: 'Asset Locations', path: '/assets', icon: MapPinned, roles: ['super_admin', 'company_admin'] },
  { label: 'Review Cases', path: '/reviews', icon: MessageSquare, roles: ['super_admin', 'company_admin', 'client_manager'] },
  { label: 'System Instructions', path: '/instructions', icon: BookOpen, roles: ['super_admin', 'company_admin'] },
];

const clientNavItems = [
  { label: 'Portal Home', path: '/', icon: LayoutDashboard },
  { label: 'My Projects', path: '/portal/projects', icon: FolderOpen },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isClientUser, profile } = useUserProfile();

  const navItems = (isClientUser ? clientNavItems : companyNavItems).filter((item) => !item.roles || item.roles.includes(profile?.role));

  return (
    <aside className={cn(
      "flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 shrink-0",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border shrink-0">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Eye className="w-4 h-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">CCG Site Docs</p>
            <p className="text-[10px] text-sidebar-foreground/60 truncate">Documentation Portal</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navItems.map(item => {
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        {!collapsed && profile && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium truncate">{profile.full_name}</p>
            <p className="text-[10px] text-sidebar-foreground/60 truncate">{getRoleLabel(profile.role)}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}