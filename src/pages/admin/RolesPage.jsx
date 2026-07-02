import PageHeader from '../../components/shared/PageHeader';
import { ROLE_HIERARCHY, MODULE_ACCESS, getRoleModules } from '../../constants/permissions';
import { ROLE_LABELS } from '../../constants/routes';
import { cn } from '../../utils/helpers';

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Role hierarchy and module access matrix for your organization"
      />

      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4">Role Hierarchy</h3>
        <div className="space-y-3">
          {ROLE_HIERARCHY.map((r, idx) => (
            <div key={r.role} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                {idx + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                <p className="text-xs text-slate-500">{r.description}</p>
                <p className="text-[11px] text-slate-400 mt-1">{MODULE_ACCESS[r.role]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {ROLE_HIERARCHY.filter((r) => r.role !== 'super_admin').map((r) => {
          const modules = getRoleModules(r.role);
          return (
            <div key={r.role} className="card p-5">
              <h3 className="text-sm font-semibold mb-3">{ROLE_LABELS[r.role] || r.label}</h3>
              <div className="space-y-3">
                {modules.map((m) => (
                  <div key={m.section}>
                    <p className="text-[10px] font-semibold uppercase text-slate-400 mb-1">{m.section}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {m.items.map((item) => (
                        <span
                          key={item}
                          className={cn('text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600')}
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card p-5 bg-amber-50 border-amber-100">
        <p className="text-sm text-amber-800">
          Custom role permissions and fine-grained ACL editing will be available in a future release.
          Employee roles are assigned per user under <strong>Employees → Employment</strong>.
        </p>
      </div>
    </div>
  );
}
