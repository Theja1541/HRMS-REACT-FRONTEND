import { useQuery } from '@tanstack/react-query';
import { brandingApi } from '../../api';
import { resolveAssetUrl, cn } from '../../utils/helpers';

/**
 * Platform branding for login / forgot-password (super-admin uploaded logo).
 */
export default function AuthBrandPanel({ variant = 'dark' }) {
  const isDark = variant === 'dark';

  const { data } = useQuery({
    queryKey: ['platform-branding-public'],
    queryFn: brandingApi.getPublicPlatformBranding,
    staleTime: 5 * 60_000,
  });

  const branding = data?.data?.branding;
  const logoUrl = resolveAssetUrl(branding?.logo_url || '');
  const brandTitle = branding?.platform_name || 'HRMS';
  const brandSubtitle = 'Enterprise Platform';

  return (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${brandTitle} logo`}
          className={cn(
            'h-11 w-11 shrink-0 rounded-xl object-contain p-1',
            isDark ? 'bg-white/10 ring-1 ring-white/20' : 'border border-slate-200 bg-white'
          )}
        />
      ) : (
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold',
            isDark
              ? 'bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-sm'
              : 'bg-brand-600 text-white'
          )}
        >
          H
        </div>
      )}
      <div>
        <p className={cn('text-lg font-semibold leading-none', isDark ? 'text-white' : 'text-slate-900')}>
          {brandTitle}
        </p>
        <p className={cn('mt-1 text-xs', isDark ? 'text-white/60' : 'text-slate-500')}>{brandSubtitle}</p>
      </div>
    </div>
  );
}
