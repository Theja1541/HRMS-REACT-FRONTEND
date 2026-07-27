import { useQuery } from '@tanstack/react-query';
import { platformApi } from '../../api';
import PageHeader from '../../components/shared/PageHeader';
import TablePagination from '../../components/shared/TablePagination';
import { useTablePagination, normalizePagination } from '../../hooks/useTablePagination';
import { format, parseISO } from 'date-fns';

export default function AuditLogsPage() {
  const { page, limit, setPage, setLimit, queryParams } = useTablePagination();

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => platformApi.listAuditLogs(queryParams),
  });

  const logs = data?.data?.logs || [];
  const pagination = normalizePagination(data?.data?.pagination, limit);

  return (
    <div className="space-y-6">
      <PageHeader badge="Platform · Audit" title="Audit Logs" subtitle="Immutable trail of system actions" />

      <div className="card overflow-x-auto overscroll-x-contain">
        {isLoading ? <p className="p-8 text-center text-slate-400">Loading…</p> : logs.length === 0 ? (
          <p className="p-12 text-center text-slate-400">No audit entries</p>
        ) : (
          <>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b"><tr>
                <th className="text-left px-4 py-3 font-semibold">Time</th>
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
                <th className="text-left px-4 py-3 font-semibold">Entity</th>
                <th className="text-left px-4 py-3 font-semibold">Summary</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {format(parseISO(log.created_at), 'dd MMM yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-2.5">{log.user_email || '—'}</td>
                    <td className="px-4 py-2.5"><span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px] uppercase">{log.action}</span></td>
                    <td className="px-4 py-2.5 text-slate-500">{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}</td>
                    <td className="px-4 py-2.5">{log.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      </div>
    </div>
  );
}
