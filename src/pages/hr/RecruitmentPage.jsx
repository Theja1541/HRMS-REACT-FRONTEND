import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Briefcase, Pencil, ExternalLink, Users, UserPlus, Eye, Upload, Paperclip, X } from 'lucide-react';
import CandidateDetailDrawer from '../../components/recruitment/CandidateDetailDrawer';
import { hrApi, departmentApi, designationApi } from '../../api';
import PageHeader, { StatCard } from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import InternationalPhoneInput from '../../components/shared/InternationalPhoneInput';
import RecruitmentWorkflowBanner from '../../modules/Recruitment/RecruitmentWorkflowBanner';
import { JOB_STATUSES, APPLICATION_STATUSES } from '../../constants/hr';
import {
  POSTING_TYPES,
  POSTING_TYPE_LABELS,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  APPLICATION_SOURCES,
  APPLICATION_SOURCE_LABELS,
  EMPTY_OPENING_FORM,
} from '../../constants/recruitment';
import { formatINR, cn, resolveAssetUrl } from '../../utils/helpers';
import { formatPhoneForStorage, isValidInternationalPhone, isValidEmail } from '../../utils/validation';
import { useTablePagination } from '../../hooks/useTablePagination';
import { useAuthStore } from '../../store/auth.store';

function StatusPill({ status, map }) {
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', map[status] || 'bg-slate-100')}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

function PostingTypePill({ type }) {
  const styles = {
    internal: 'bg-indigo-50 text-indigo-700',
    external: 'bg-orange-50 text-orange-700',
    both: 'bg-violet-50 text-violet-700',
  };
  return (
    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', styles[type] || 'bg-slate-100')}>
      {POSTING_TYPE_LABELS[type] || type}
    </span>
  );
}

function openingToForm(opening) {
  return {
    title: opening.title || '',
    department_id: opening.department_id ? String(opening.department_id) : '',
    designation_id: opening.designation_id ? String(opening.designation_id) : '',
    openings: opening.openings || 1,
    status: opening.status || 'draft',
    posting_type: opening.posting_type || 'both',
    is_referral_eligible: opening.is_referral_eligible !== false,
    location: opening.location || '',
    employment_type: opening.employment_type || 'full_time',
    description: opening.description || '',
    attachment: null,
    existing_attachment_url: opening.attachment_url || '',
    existing_attachment_name: opening.attachment_name || '',
    remove_attachment: false,
    min_experience: opening.min_experience ?? '',
    max_ctc: opening.max_ctc ?? '',
    closes_at: opening.closes_at ? String(opening.closes_at).slice(0, 10) : '',
  };
}

export default function RecruitmentPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const careersSlug = user?.tenant?.slug;

  const [tab, setTab] = useState('openings');
  const [openingModal, setOpeningModal] = useState(null);
  const [openingForm, setOpeningForm] = useState(EMPTY_OPENING_FORM);
  const [showAppForm, setShowAppForm] = useState(false);
  const [pipelineOpeningFilter, setPipelineOpeningFilter] = useState('');
  const [pipelineSourceFilter, setPipelineSourceFilter] = useState('');
  const [selectedApplicationId, setSelectedApplicationId] = useState(null);
  const [appForm, setAppForm] = useState({
    job_opening_id: '',
    candidate_name: '',
    email: '',
    phone: '',
    source: 'direct',
    experience_years: '',
    expected_ctc: '',
    notes: '',
  });

  const { setPage: setOpeningsPage, setLimit: setOpeningsLimit, paginateClient: paginateOpenings } =
    useTablePagination({ resetDeps: [tab] });
  const { setPage: setAppsPage, setLimit: setAppsLimit, paginateClient: paginateApps } =
    useTablePagination({ resetDeps: [tab, pipelineOpeningFilter, pipelineSourceFilter] });

  const { data: openingsData, isLoading } = useQuery({
    queryKey: ['job-openings'],
    queryFn: () => hrApi.listOpenings(),
  });
  const { data: appsData } = useQuery({
    queryKey: ['job-applications'],
    queryFn: () => hrApi.listApplications(),
  });
  const { data: deptData } = useQuery({ queryKey: ['departments'], queryFn: () => departmentApi.list() });
  const { data: desigData } = useQuery({ queryKey: ['designations'], queryFn: () => designationApi.list() });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['job-openings'] });
    queryClient.invalidateQueries({ queryKey: ['job-applications'] });
  };

  const saveOpening = useMutation({
    mutationFn: (payload) =>
      openingModal?.mode === 'edit'
        ? hrApi.updateOpening(openingModal.id, payload)
        : hrApi.createOpening(payload),
    onSuccess: () => {
      invalidate();
      setOpeningModal(null);
      setOpeningForm(EMPTY_OPENING_FORM);
    },
  });

  const createApp = useMutation({
    mutationFn: (payload) => hrApi.createApplication(payload),
    onSuccess: () => {
      invalidate();
      setShowAppForm(false);
    },
  });

  const updateAppStatus = useMutation({
    mutationFn: ({ id, status }) => hrApi.updateApplicationStatus(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['job-applications'] }),
  });

  const openings = openingsData?.data?.openings || [];
  const applications = appsData?.data?.applications || [];

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (pipelineOpeningFilter && String(app.job_opening_id) !== pipelineOpeningFilter) return false;
      if (pipelineSourceFilter && app.source !== pipelineSourceFilter) return false;
      return true;
    });
  }, [applications, pipelineOpeningFilter, pipelineSourceFilter]);

  const { items: visibleOpenings, pagination: openingsPagination } = paginateOpenings(openings);
  const { items: visibleApplications, pagination: appsPagination } = paginateApps(filteredApplications);

  const openCreate = () => {
    setOpeningForm(EMPTY_OPENING_FORM);
    setOpeningModal({ mode: 'create' });
  };

  const openEdit = (opening) => {
    setOpeningForm(openingToForm(opening));
    setOpeningModal({ mode: 'edit', id: opening.id });
  };

  const buildOpeningPayload = () => {
    const fd = new FormData();
    fd.append('title', openingForm.title.trim());
    if (openingForm.department_id) fd.append('department_id', openingForm.department_id);
    if (openingForm.designation_id) fd.append('designation_id', openingForm.designation_id);
    fd.append('openings', String(parseInt(openingForm.openings, 10) || 1));
    fd.append('status', openingForm.status);
    fd.append('posting_type', openingForm.posting_type);
    fd.append('is_referral_eligible', String(openingForm.is_referral_eligible));
    if (openingForm.location.trim()) fd.append('location', openingForm.location.trim());
    fd.append('employment_type', openingForm.employment_type);
    fd.append('description', openingForm.description.trim());
    if (openingForm.min_experience !== '') fd.append('min_experience', openingForm.min_experience);
    if (openingForm.max_ctc !== '') fd.append('max_ctc', openingForm.max_ctc);
    if (openingForm.closes_at) fd.append('closes_at', openingForm.closes_at);
    if (openingForm.attachment) fd.append('attachment', openingForm.attachment);
    if (openingForm.remove_attachment) fd.append('remove_attachment', 'true');
    return fd;
  };

  const stats = {
    open: openings.filter((o) => o.status === 'open').length,
    internal: openings.filter((o) => o.posting_type === 'internal' || o.posting_type === 'both').length,
    referrals: applications.filter((a) => a.source === 'referral').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        badge="People · Recruitment"
        title="Recruitment"
        subtitle="Internal mobility, external hiring, employee referrals, and candidate pipeline"
        actions={
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => setShowAppForm(true)} className="btn-secondary">
              <UserPlus size={14} /> Add Candidate
            </button>
            <button type="button" onClick={openCreate} className="btn-primary">
              <Plus size={14} /> New Opening
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Open Positions" value={stats.open} icon={Briefcase} />
        <StatCard label="Internal-eligible roles" value={stats.internal} delta="Includes internal + both" deltaType="neutral" />
        <StatCard label="Employee referrals" value={stats.referrals} icon={Users} delta="In pipeline" deltaType="neutral" />
      </div>

      <RecruitmentWorkflowBanner careersSlug={careersSlug} />

      <div className="ds-tabs scroll-tabs" role="tablist">
        {[
          { key: 'openings', label: 'Job Openings' },
          { key: 'pipeline', label: `Candidate Pipeline (${applications.length})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(tab === t.key && 'ds-tab-active')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'openings' && (
        <div className="card overflow-x-auto overscroll-x-contain">
          {isLoading ? (
            <p className="p-8 text-center text-slate-400">Loading…</p>
          ) : openings.length === 0 ? (
            <p className="p-12 text-center text-slate-400">No job openings yet. Create your first role.</p>
          ) : (
            <>
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">Role</th>
                    <th className="text-left px-4 py-3 font-semibold">Channel</th>
                    <th className="text-left px-4 py-3 font-semibold">Department</th>
                    <th className="text-left px-4 py-3 font-semibold">Location</th>
                    <th className="text-right px-4 py-3 font-semibold">Max CTC</th>
                    <th className="text-center px-4 py-3 font-semibold">HC</th>
                    <th className="text-center px-4 py-3 font-semibold">Applicants</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleOpenings.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium flex items-center gap-2">
                          <Briefcase size={14} className="text-brand-600 shrink-0" />
                          {o.title}
                        </p>
                        {o.is_referral_eligible && o.posting_type !== 'internal' && (
                          <span className="text-[9px] text-emerald-600 font-medium">Referrals enabled</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PostingTypePill type={o.posting_type || 'both'} />
                      </td>
                      <td className="px-4 py-3">{o.department?.name || '—'}</td>
                      <td className="px-4 py-3">{o.location || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">{o.max_ctc ? formatINR(o.max_ctc) : '—'}</td>
                      <td className="px-4 py-3 text-center">{o.openings}</td>
                      <td className="px-4 py-3 text-center font-semibold">{o.application_count}</td>
                      <td className="px-4 py-3">
                        <StatusPill status={o.status} map={JOB_STATUSES} />
                      </td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => openEdit(o)} className="text-slate-400 hover:text-brand-600" title="Edit">
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePagination
                page={openingsPagination.page}
                limit={openingsPagination.limit}
                total={openingsPagination.total}
                totalPages={openingsPagination.totalPages}
                onPageChange={setOpeningsPage}
                onLimitChange={setOpeningsLimit}
              />
            </>
          )}
        </div>
      )}

      {tab === 'pipeline' && (
        <div className="space-y-3">
          <div className="card overflow-hidden">
            <div className="ds-toolbar">
              <div className="toolbar-row">
            <select
              value={pipelineOpeningFilter}
              onChange={(e) => setPipelineOpeningFilter(e.target.value)}
              className="ds-select flex-1 sm:min-w-[180px]"
            >
              <option value="">All openings</option>
              {openings.map((o) => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
            <select
              value={pipelineSourceFilter}
              onChange={(e) => setPipelineSourceFilter(e.target.value)}
              className="ds-select w-full sm:w-auto sm:min-w-[160px]"
            >
              <option value="">All sources</option>
              {APPLICATION_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
              </div>
            </div>

          <div className="overflow-x-auto overscroll-x-contain">
            {filteredApplications.length === 0 ? (
              <p className="p-12 text-center text-slate-400">No applications match your filters</p>
            ) : (
              <>
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Candidate</th>
                      <th className="text-left px-4 py-3 font-semibold">Role</th>
                      <th className="text-left px-4 py-3 font-semibold">Source</th>
                      <th className="text-right px-4 py-3 font-semibold">Exp</th>
                      <th className="text-right px-4 py-3 font-semibold">Expected CTC</th>
                      <th className="text-left px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleApplications.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedApplicationId(a.id)}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-brand-700 hover:underline">{a.candidate_name}</p>
                          <p className="text-slate-400">{a.email}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {a.applicant && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-700">
                                Internal{a.applicant.emp_code ? ` · ${a.applicant.emp_code}` : ''}
                              </span>
                            )}
                            {a.referrer && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                Referred by {a.referrer.first_name} {a.referrer.last_name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{a.jobOpening?.title}</td>
                        <td className="px-4 py-3">{APPLICATION_SOURCE_LABELS[a.source] || a.source}</td>
                        <td className="px-4 py-3 text-right">{a.experience_years ? `${a.experience_years}y` : '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">{a.expected_ctc ? formatINR(a.expected_ctc) : '—'}</td>
                        <td className="px-4 py-3">
                          <StatusPill status={a.status} map={APPLICATION_STATUSES} />
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setSelectedApplicationId(a.id)}
                              className="text-slate-400 hover:text-brand-600 p-1"
                              title="View details"
                            >
                              <Eye size={14} />
                            </button>
                            <select
                              value={a.status}
                              onChange={(e) => updateAppStatus.mutate({ id: a.id, status: e.target.value })}
                              className="text-xs border border-slate-200 rounded px-2 py-1"
                            >
                              {Object.keys(APPLICATION_STATUSES).map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePagination
                  page={appsPagination.page}
                  limit={appsPagination.limit}
                  total={appsPagination.total}
                  totalPages={appsPagination.totalPages}
                  onPageChange={setAppsPage}
                  onLimitChange={setAppsLimit}
                />
              </>
            )}
          </div>
          </div>
        </div>
      )}

      {openingModal && (
        <Modal title={openingModal.mode === 'edit' ? 'Edit Job Opening' : 'New Job Opening'} onClose={() => setOpeningModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!openingForm.description.trim()) {
                window.alert('Job description is required');
                return;
              }
              saveOpening.mutate(buildOpeningPayload());
            }}
            className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
          >
            <Field label="Job title" value={openingForm.title} onChange={(v) => setOpeningForm({ ...openingForm, title: v })} required colSpan />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Posting channel"
                value={openingForm.posting_type}
                onChange={(v) => setOpeningForm({ ...openingForm, posting_type: v })}
                options={POSTING_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                hint={POSTING_TYPES.find((t) => t.value === openingForm.posting_type)?.description}
              />
              <Select
                label="Status"
                value={openingForm.status}
                onChange={(v) => setOpeningForm({ ...openingForm, status: v })}
                options={Object.keys(JOB_STATUSES).map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))}
              />
              <Select
                label="Department"
                value={openingForm.department_id}
                onChange={(v) => setOpeningForm({ ...openingForm, department_id: v })}
                options={(deptData?.data?.departments || []).map((d) => ({ value: d.id, label: d.name }))}
              />
              <Select
                label="Designation"
                value={openingForm.designation_id}
                onChange={(v) => setOpeningForm({ ...openingForm, designation_id: v })}
                options={(desigData?.data?.designations || []).map((d) => ({ value: d.id, label: d.name }))}
              />
              <Field label="Location" value={openingForm.location} onChange={(v) => setOpeningForm({ ...openingForm, location: v })} />
              <Select
                label="Employment type"
                value={openingForm.employment_type}
                onChange={(v) => setOpeningForm({ ...openingForm, employment_type: v })}
                options={EMPLOYMENT_TYPES}
              />
              <Field label="Headcount" type="number" value={openingForm.openings} onChange={(v) => setOpeningForm({ ...openingForm, openings: v })} />
              <Field label="Min experience (years)" type="number" value={openingForm.min_experience} onChange={(v) => setOpeningForm({ ...openingForm, min_experience: v })} />
              <Field label="Max CTC" type="number" value={openingForm.max_ctc} onChange={(v) => setOpeningForm({ ...openingForm, max_ctc: v })} />
              <Field label="Closes on" type="date" value={openingForm.closes_at} onChange={(v) => setOpeningForm({ ...openingForm, closes_at: v })} />
            </div>
            {openingForm.posting_type !== 'internal' && (
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={openingForm.is_referral_eligible}
                  onChange={(e) => setOpeningForm({ ...openingForm, is_referral_eligible: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Allow employees to refer external candidates for this role
              </label>
            )}
            <div>
              <label className="text-xs font-medium text-slate-600">
                Job description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={openingForm.description}
                onChange={(e) => setOpeningForm({ ...openingForm, description: e.target.value })}
                rows={4}
                required
                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="Responsibilities, qualifications, and what success looks like…"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">Job description attachment</label>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-1">
                Optional. Internal and external candidates can view and download this file.
              </p>
              {openingForm.existing_attachment_url && !openingForm.remove_attachment && !openingForm.attachment && (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <Paperclip size={14} className="text-slate-400 shrink-0" />
                  <a
                    href={resolveAssetUrl(openingForm.existing_attachment_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 truncate text-brand-600 hover:underline"
                  >
                    {openingForm.existing_attachment_name || 'Current attachment'}
                  </a>
                  <button
                    type="button"
                    onClick={() => setOpeningForm({ ...openingForm, remove_attachment: true, attachment: null })}
                    className="text-slate-400 hover:text-red-600"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <label className="mt-1 flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-600 cursor-pointer hover:bg-slate-50">
                <Upload size={14} />
                {openingForm.attachment
                  ? openingForm.attachment.name
                  : openingForm.remove_attachment
                    ? 'Choose a new file (current will be removed)'
                    : 'Upload PDF, DOC, DOCX, or image'}
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  className="sr-only"
                  onChange={(e) =>
                    setOpeningForm({
                      ...openingForm,
                      attachment: e.target.files?.[0] || null,
                      remove_attachment: false,
                    })
                  }
                />
              </label>
            </div>
            {careersSlug && openingForm.posting_type !== 'internal' && openingForm.status === 'open' && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <ExternalLink size={12} />
                External candidates can apply at /careers/{careersSlug}
              </p>
            )}
            <FormActions onCancel={() => setOpeningModal(null)} loading={saveOpening.isPending} />
          </form>
        </Modal>
      )}

      {selectedApplicationId && (
        <CandidateDetailDrawer
          applicationId={selectedApplicationId}
          onClose={() => setSelectedApplicationId(null)}
        />
      )}

      {showAppForm && (
        <Modal title="Add Candidate (HR)" onClose={() => setShowAppForm(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (appForm.phone.trim() && !isValidInternationalPhone(appForm.phone)) {
                window.alert('Enter a valid international mobile number');
                return;
              }
              if (!isValidEmail(appForm.email)) {
                window.alert('Enter a valid email');
                return;
              }
              createApp.mutate({
                ...appForm,
                job_opening_id: parseInt(appForm.job_opening_id, 10),
                phone: formatPhoneForStorage(appForm.phone),
                experience_years: appForm.experience_years ? parseFloat(appForm.experience_years) : null,
                expected_ctc: appForm.expected_ctc ? parseFloat(appForm.expected_ctc) : null,
              });
            }}
            className="grid grid-cols-2 gap-4"
          >
            <Select
              label="Job Opening"
              colSpan
              value={appForm.job_opening_id}
              onChange={(v) => setAppForm({ ...appForm, job_opening_id: v })}
              options={openings.map((o) => ({ value: o.id, label: o.title }))}
              required
            />
            <Select
              label="Source"
              value={appForm.source}
              onChange={(v) => setAppForm({ ...appForm, source: v })}
              options={APPLICATION_SOURCES.filter((s) => s.value !== 'internal')}
            />
            <Field label="Name" value={appForm.candidate_name} onChange={(v) => setAppForm({ ...appForm, candidate_name: v })} required />
            <Field label="Email" type="email" value={appForm.email} onChange={(v) => setAppForm({ ...appForm, email: v })} required />
            <InternationalPhoneInput label="Phone" value={appForm.phone} onChange={(v) => setAppForm({ ...appForm, phone: v })} />
            <Field label="Experience (years)" type="number" value={appForm.experience_years} onChange={(v) => setAppForm({ ...appForm, experience_years: v })} />
            <Field label="Expected CTC" type="number" value={appForm.expected_ctc} onChange={(v) => setAppForm({ ...appForm, expected_ctc: v })} />
            <FormActions onCancel={() => setShowAppForm(false)} loading={createApp.isPending} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b flex justify-between items-center shrink-0">
          <h3 className="font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400">✕</button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, colSpan }) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, required, colSpan, hint }) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <select
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function FormActions({ onCancel, loading }) {
  return (
    <div className="col-span-2 flex gap-2 justify-end pt-2">
      <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save'}</button>
    </div>
  );
}
