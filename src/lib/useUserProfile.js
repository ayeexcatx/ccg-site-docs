import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Hook to get the current user's profile with role info
export function useUserProfile() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const user = await base44.auth.me();
        if (!user) { setIsLoading(false); return; }
        
        const profiles = await base44.entities.UserProfile.filter({ email: user.email });
        if (profiles.length > 0) {
          setProfile(profiles[0]);
        } else {
          // Auto-create a profile for new users
          setProfile({
            user_id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role === 'admin' ? 'super_admin' : 'client_viewer',
            is_active: true
          });
        }
      } catch (e) {
        console.error('Error loading profile:', e);
      }
      setIsLoading(false);
    }
    loadProfile();
  }, []);

  const isCompanyUser = profile && ['super_admin', 'company_admin', 'documenter'].includes(profile.role);
  const isClientUser = profile && ['client_manager', 'client_viewer'].includes(profile.role);
  const isAdmin = profile && ['super_admin', 'company_admin'].includes(profile.role);
  const isDocumenter = profile?.role === 'documenter';

  return { profile, isLoading, isCompanyUser, isClientUser, isAdmin, isDocumenter };
}