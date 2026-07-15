import { useQuery } from '@tanstack/react-query';
import { brandingApi } from '../../api';
import { resolveAssetUrl, cn } from '../../utils/helpers';

/**
 * Platform branding for login / forgot-password (super-admin uploaded logo).
 */
export default function AuthBrandPanel({ variant = 'dark', size = 'default' }) {
  const isDark = variant === 'dark';
  const isLarge = size === 'large';

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
    <div className={cn('flex items-center', isLarge ? 'gap-4' : 'gap-3')}>
      {logoUrl ? (
        <div
          className={cn(
            'shrink-0 overflow-hidden flex items-center justify-center',
            isLarge ? 'h-20 w-20 rounded-2xl p-1.5' : 'h-16 w-16 rounded-2xl p-1.5',
            isDark
              ? 'bg-white shadow-2xl shadow-black/20 ring-1 ring-white/30'
              : 'border border-slate-200 bg-white shadow-sm'
          )}
        >
          <img
            src={logoUrl}
            alt={`${brandTitle} logo`}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-2xl font-bold',
            isLarge ? 'h-20 w-20 text-2xl' : 'h-16 w-16 text-xl',
            isDark
              ? 'bg-white text-brand-700 ring-1 ring-white/30 shadow-2xl shadow-black/20'
              : 'bg-brand-600 text-white'
          )}
        >
          H
        </div>
      )}
      <div>
        <p className={cn(isLarge ? 'text-2xl' : 'text-xl', 'font-bold leading-none', isDark ? 'text-white' : 'text-slate-900')}>
          {brandTitle}
        </p>
        <p className={cn(isLarge ? 'mt-2 text-sm' : 'mt-1.5 text-xs', isDark ? 'text-white/70' : 'text-slate-500')}>
          {brandSubtitle}
        </p>
      </div>
    </div>
  );
}
