import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, ChevronDown, Globe2 } from 'lucide-react';
import { tenantApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { cn, getInitials } from '../../utils/helpers';

export default function TenantSwitcher({ showLabels, isIconOnly }) {
  const navigate = useNavigate();
  const { selectedTenantId, setSelectedTenantId } = useAuthStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const { data } = useQuery({
    queryKey: ['tenants-switcher'],
    queryFn: () => tenantApi.list({ limit: 100 }),
    staleTime: 60_000,
  });

  const tenants = data?.data?.tenants || [];
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const label = selectedTenantId ? (selectedTenant?.name || 'Organization') : 'All Organizations';
  const isPlatformView = !selectedTenantId;

  useEffect(() => {
    if (!open) return undefined;

    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const selectPlatform = () => {
    setSelectedTenantId(null);
    setOpen(false);
    navigate('/dashboard');
  };

  const selectTenant = (tenantId) => {
    setSelectedTenantId(tenantId);
    setOpen(false);
    navigate('/dashboard');
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          'w-full flex items-center bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors',
          isIconOnly ? 'justify-center p-2' : 'gap-2 px-2.5 py-2',
          open && 'ring-1 ring-brand-500/50'
        )}
      >
        <div
          className={cn(
            'w-5 h-5 rounded-full text-[9px] font-semibold text-white flex items-center justify-center shrink-0',
            isPlatformView ? 'bg-emerald-600' : 'bg-brand-600'
          )}
        >
          {isPlatformView ? <Globe2 size={11} /> : getInitials(label)}
        </div>
        {showLabels && (
          <>
            <span className="text-slate-300 text-xs font-medium flex-1 text-left truncate">{label}</span>
            <ChevronDown
              size={13}
              className={cn('text-slate-500 shrink-0 transition-transform', open && 'rotate-180')}
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="listbox"
          className={cn(
            'absolute z-50 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden',
            isIconOnly ? 'left-0 w-56' : 'left-0 right-0'
          )}
        >
          <div className="max-h-64 overflow-y-auto py-1">
            <button
              type="button"
              role="option"
              aria-selected={isPlatformView}
              onClick={selectPlatform}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-slate-800 transition-colors',
                isPlatformView && 'bg-slate-800 text-white'
              )}
            >
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Globe2 size={12} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-200 truncate">All Organizations</p>
                <p className="text-[10px] text-slate-500">Platform dashboard</p>
              </div>
              {isPlatformView && <Check size={14} className="text-emerald-400 shrink-0" />}
            </button>

            {tenants.length > 0 && (
              <div className="border-t border-slate-800 my-1" aria-hidden />
            )}

            {tenants.map((tenant) => {
              const active = selectedTenantId === tenant.id;
              return (
                <button
                  key={tenant.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => selectTenant(tenant.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-800 transition-colors',
                    active && 'bg-slate-800'
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-brand-600 text-white text-[9px] font-semibold flex items-center justify-center shrink-0">
                    {getInitials(tenant.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-200 truncate">{tenant.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">{tenant.slug}</p>
                  </div>
                  {active && <Check size={14} className="text-brand-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-800 p-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/tenants');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-md transition-colors"
            >
              <Building2 size={13} />
              Manage organizations
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
