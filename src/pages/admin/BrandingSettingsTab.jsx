import { useRef, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Trash2, Building2, Info } from 'lucide-react';
import { brandingApi, authApi } from '../../api';
import { useAuthStore } from '../../store/auth.store';
import { resolveAssetUrl, cn } from '../../utils/helpers';

const LOGO_HINTS = [
  'Use a square or wide logo on transparent background',
  'Recommended: 200×200 px minimum, PNG or SVG',
  'Max file size: 2 MB',
];

function LogoUploadCard({
  title,
  description,
  logoUrl,
  name,
  onUpload,
  onRemove,
  uploading,
  error,
}) {
  const inputRef = useRef(null);
  const preview = logoUrl ? resolveAssetUrl(logoUrl) : '';

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-slate-50/80">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>

      <div className="p-6 flex flex-col sm:flex-row gap-6 items-start">
        <div
          className={cn(
            'w-28 h-28 rounded-xl border-2 border-dashed flex items-center justify-center shrink-0 overflow-hidden',
            preview ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'
          )}
        >
          {preview ? (
            <img src={preview} alt={`${name} logo`} className="w-full h-full object-contain p-2" />
          ) : (
            <Building2 size={32} className="text-slate-300" />
          )}
        </div>

        <div className="flex-1 space-y-4 min-w-0">
          {name && (
            <p className="text-sm font-medium text-slate-800">{name}</p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <ImagePlus size={14} />
              {preview ? 'Replace logo' : 'Upload logo'}
            </button>
            {preview && (
              <button
                type="button"
                disabled={uploading}
                onClick={onRemove}
                className="btn-secondary text-xs inline-flex items-center gap-1.5 text-red-600 border-red-100"
              >
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = '';
            }}
          />

          <ul className="text-[11px] text-slate-500 space-y-1">
            {LOGO_HINTS.map((hint) => (
              <li key={hint} className="flex items-start gap-1.5">
                <Info size={12} className="shrink-0 mt-0.5 text-slate-400" />
                {hint}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PlatformBrandingTab() {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState('');
  const [name, setName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['platform-branding'],
    queryFn: brandingApi.getPlatformBranding,
  });

  const branding = data?.data?.branding;

  useEffect(() => {
    if (branding?.platform_name) setName(branding.platform_name);
  }, [branding?.platform_name]);

  const uploadMutation = useMutation({
    mutationFn: brandingApi.uploadPlatformLogo,
    onSuccess: () => {
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['platform-branding'] });
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Upload failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => brandingApi.updatePlatformBranding(payload),
    onSuccess: () => {
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['platform-branding'] });
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Update failed'),
  });

  if (isLoading) {
    return <p className="text-center text-slate-400 py-12 text-sm">Loading platform branding…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-3 text-xs text-indigo-900">
        This logo appears on the <strong>login page</strong> for all users and in the <strong>Super Admin</strong> sidebar. Company logos are uploaded separately and shown only in each company&apos;s sidebar.
      </div>

      <div className="max-w-md">
        <label className="text-xs font-medium text-slate-600">Platform name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
          placeholder="HRMS"
        />
        <button
          type="button"
          disabled={updateMutation.isPending || !name.trim()}
          onClick={() => updateMutation.mutate({ platform_name: name.trim() })}
          className="btn-secondary text-xs mt-2"
        >
          Save name
        </button>
      </div>

      <LogoUploadCard
        title="Platform logo"
        description="Shown at the top of the sidebar when you are logged in as Super Admin."
        logoUrl={branding?.logo_url}
        name={branding?.platform_name || 'HRMS'}
        uploading={uploadMutation.isPending}
        error={formError}
        onUpload={(file) => uploadMutation.mutate(file)}
        onRemove={() => updateMutation.mutate({ logo_url: null })}
      />
    </div>
  );
}

export function CompanyBrandingTab() {
  const queryClient = useQueryClient();
  const { user, setUser } = useAuthStore();
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['company-branding'],
    queryFn: brandingApi.getCompanyBranding,
  });

  const branding = data?.data?.branding || user?.tenant;

  const uploadMutation = useMutation({
    mutationFn: brandingApi.uploadCompanyLogo,
    onSuccess: async (res) => {
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['company-branding'] });
      const me = await authApi.me();
      if (me?.data?.user) setUser(me.data.user);
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Upload failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload) => brandingApi.updateCompanyBranding(payload),
    onSuccess: async () => {
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['company-branding'] });
      const me = await authApi.me();
      if (me?.data?.user) setUser(me.data.user);
    },
    onError: (err) => setFormError(err.response?.data?.error?.message || 'Update failed'),
  });

  if (isLoading) {
    return <p className="text-center text-slate-400 py-12 text-sm">Loading company branding…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-xs text-emerald-900">
        This logo appears in the <strong>sidebar</strong> for all users in{' '}
        <strong>{branding?.name}</strong> after they sign in. The login page always shows the platform logo.
      </div>

      <LogoUploadCard
        title="Company logo"
        description="Displayed in the sidebar for your employees, managers, and admins."
        logoUrl={branding?.logo_url}
        name={branding?.name}
        uploading={uploadMutation.isPending}
        error={formError}
        onUpload={(file) => uploadMutation.mutate(file)}
        onRemove={() => updateMutation.mutate({ logo_url: null })}
      />
    </div>
  );
}

export default function BrandingSettingsTab() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  if (isSuperAdmin) {
    return <PlatformBrandingTab />;
  }

  return <CompanyBrandingTab />;
}
