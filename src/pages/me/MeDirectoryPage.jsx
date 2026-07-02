import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronDown, ChevronRight, X, Mail, Phone, Users } from 'lucide-react';
import { portalApi, departmentApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import { Avatar } from '../../components/shared/StatusBadge';
import { cn } from '../../utils/helpers';
import { format, parseISO } from 'date-fns';
import { useAuthStore } from '../../store/auth.store';

function OrgNode({ node, depth = 0, onSelect }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children?.length > 0;

  return (
    <div className={cn(depth > 0 && 'ml-5 border-l border-slate-200 pl-4')}>
      <div className="flex items-center gap-2 py-2">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-slate-400 hover:text-slate-600 p-0.5"
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex items-center gap-2 text-left hover:bg-slate-50 rounded-lg px-2 py-1 flex-1 min-w-0"
        >
          <Avatar name={node.name} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">{node.name}</p>
            <p className="text-[10px] text-slate-400 truncate">
              {node.designation?.name || node.emp_code}
              {node.department?.name ? ` · ${node.department.name}` : ''}
            </p>
          </div>
        </button>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <OrgNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileDrawer({ employeeId, onClose }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['directory-profile', employeeId],
    queryFn: () => portalApi.getDirectoryProfile(employeeId),
    enabled: !!employeeId,
  });

  const profile = data?.data;
  const emp = profile?.employee;
  const reports = profile?.direct_reports || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/30" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md bg-white shadow-xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Employee Profile</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {isLoading && <p className="p-8 text-center text-sm text-slate-400">Loading…</p>}
        {error && <p className="p-8 text-center text-sm text-red-500">Failed to load profile</p>}

        {emp && (
          <div className="p-5 space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={emp.name} size="lg" />
              <div>
                <h4 className="text-lg font-semibold">{emp.name}</h4>
                <p className="text-sm text-slate-500">{emp.designation?.name || '—'}</p>
                <p className="text-xs text-slate-400">{emp.emp_code}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {emp.email && (
                <p className="flex items-center gap-2 text-slate-600">
                  <Mail size={14} className="text-slate-400" /> {emp.email}
                </p>
              )}
              {emp.phone && (
                <p className="flex items-center gap-2 text-slate-600">
                  <Phone size={14} className="text-slate-400" /> {emp.phone}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-lg text-sm">
              <div>
                <p className="text-[10px] uppercase text-slate-400">Department</p>
                <p>{emp.department?.name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400">Branch</p>
                <p>{emp.branch?.name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400">Manager</p>
                <p>{emp.manager?.name || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-400">Joined</p>
                <p>
                  {emp.date_of_joining ? format(parseISO(emp.date_of_joining), 'dd MMM yyyy') : '—'}
                </p>
              </div>
            </div>

            {reports.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-slate-400" />
                  <h5 className="text-sm font-semibold">Direct Reports ({reports.length})</h5>
                </div>
                <ul className="space-y-2">
                  {reports.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 text-sm">
                      <Avatar name={r.name} size="sm" />
                      <span className="font-medium">{r.name}</span>
                      <span className="text-slate-400 text-xs">{r.designation?.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MeDirectoryPage() {
  const { selectedTenantId, user } = useAuthStore();
  const tenantRequired = user?.role === 'super_admin' && !selectedTenantId;
  const [tab, setTab] = useState('directory');
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination({
    resetDeps: [search, departmentId],
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments', selectedTenantId],
    queryFn: () => departmentApi.list({ tenant_id: selectedTenantId, status: 'active' }),
    enabled: !tenantRequired,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['directory', search, departmentId, queryParams],
    queryFn: () =>
      portalApi.listDirectory({
        search: search || undefined,
        department_id: departmentId || undefined,
        ...queryParams,
      }),
    enabled: tab === 'directory' && !tenantRequired,
  });

  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['org-chart'],
    queryFn: () => portalApi.getOrgChart(),
    enabled: tab === 'org-chart' && !tenantRequired,
  });

  const employees = data?.data?.employees || [];
  const pagination = normalizePagination(data?.data?.pagination, limit);
  const departments = deptData?.data?.departments || [];
  const orgRoots = orgData?.data?.roots || [];

  return (
    <div className="space-y-6">
      <PageHeader title="People Directory" subtitle="Find colleagues and explore the org structure" />

      <div className="flex gap-1 border-b border-slate-200 scroll-tabs">
        {['directory', 'org-chart'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-xs font-medium border-b-2 -mb-px capitalize',
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500'
            )}
          >
            {t === 'org-chart' ? 'Org Chart' : 'Directory'}
          </button>
        ))}
      </div>

      {tab === 'directory' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or employee code…"
                className="flex-1 text-sm border-none outline-none bg-transparent"
              />
            </div>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white min-w-[160px]"
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {tenantRequired ? (
            <div className="card p-12 text-center text-slate-400">Select a tenant to view directory</div>
          ) : isLoading ? (
            <div className="card p-12 text-center text-slate-400">Loading directory…</div>
          ) : error ? (
            <div className="card p-12 text-center text-red-500">Failed to load directory</div>
          ) : employees.length === 0 ? (
            <div className="card p-12 text-center text-slate-400">No employees found</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => setSelectedId(emp.id)}
                    className="card p-4 text-left hover:border-brand-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.name} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{emp.name}</p>
                        <p className="text-xs text-slate-500 truncate">{emp.designation?.name || emp.emp_code}</p>
                        <p className="text-[10px] text-slate-400 truncate">{emp.department?.name}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <TablePagination
                page={pagination.page}
                limit={pagination.limit}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </>
          )}
        </>
      )}

      {tab === 'org-chart' && (
        <div className="card p-5">
          {tenantRequired ? (
            <p className="text-center text-slate-400 py-8">Select a tenant to view org chart</p>
          ) : orgLoading ? (
            <p className="text-center text-slate-400 py-8">Loading org chart…</p>
          ) : orgRoots.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No org structure data</p>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {orgRoots.map((root) => (
                <OrgNode key={root.id} node={root} onSelect={setSelectedId} />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedId && (
        <ProfileDrawer employeeId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
