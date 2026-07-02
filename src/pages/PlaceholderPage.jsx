import { Construction } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';

export default function PlaceholderPage({ title, description }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={description || 'Coming in a future phase'} />
      <div className="card p-16 text-center">
        <Construction size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          This module is defined in the HRMS master spec and will be built in upcoming phases.
          The sidebar navigation and routing are already wired.
        </p>
      </div>
    </div>
  );
}
