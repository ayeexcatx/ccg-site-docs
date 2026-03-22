import { useQuery } from '@tanstack/react-query';
import { loadSystemInstructionsForPage } from '@/lib/base44Workflows';
import { useUserProfile } from '@/lib/useUserProfile';

export function usePageInstructions(pageKey) {
  const { profile } = useUserProfile();
  const role = profile?.role || 'anonymous';

  return useQuery({
    // Page instructions remain a Base44-backed adapter concern so page components can
    // stay focused on rendering operating guidance rather than rebuilding scope filters.
    queryKey: ['page-instructions', pageKey, role],
    queryFn: () => loadSystemInstructionsForPage({ pageKey, role }),
  });
}
