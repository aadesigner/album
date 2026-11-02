import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useGetAppSettings } from '@workspace/api-client-react-tsconfig';
import { syncMicrosoftClarity } from '@/lib/clarity';

/**
 * Injects Microsoft Clarity on static pages + album builder only.
 * Admin (/heyadmin) and account routes never load it.
 */
export function MicrosoftClarity() {
  const [loc] = useLocation();
  const { data: settings } = useGetAppSettings();
  const s = settings as { clarityEnabled?: boolean; clarityProjectId?: string } | undefined;

  useEffect(() => {
    syncMicrosoftClarity({
      pathname: loc,
      settings: {
        clarityEnabled: s?.clarityEnabled,
        clarityProjectId: s?.clarityProjectId,
      },
    });
  }, [loc, s?.clarityEnabled, s?.clarityProjectId]);

  return null;
}
