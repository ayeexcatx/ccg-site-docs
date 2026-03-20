import { useQuery } from '@tanstack/react-query';
import { loadSystemInstructionsForPage } from '@/lib/base44Workflows';
import { useUserProfile } from '@/lib/useUserProfile';

export function usePageInstructions(pageKey) {
  const { profile } = useUserProfile();

  return useQuery({
    queryKey: ['page-instructions', pageKey, profile?.role || 'anonymous'],
    queryFn: () => loadSystemInstructionsForPage({ pageKey, role: profile?.role || 'anonymous' }),
  });
}
