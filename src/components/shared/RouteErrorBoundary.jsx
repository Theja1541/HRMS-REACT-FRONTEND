import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Catches render errors thrown by the routed page so a single broken page does
 * NOT unmount the whole app (which would otherwise take the sidebar/navigation
 * down with it and make every other page appear "stuck").
 *
 * AppShell mounts this with `key={location.pathname}`, so navigating to a
 * different page resets the boundary automatically and recovers.
 */
export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface the real error in the console for diagnosis.
    console.error('Page crashed:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertTriangle className="text-red-500" size={24} />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">This page hit an error</h2>
        <p className="text-sm text-slate-500 mt-1 max-w-md">
          Something went wrong while loading this page. You can keep using the rest of the app from
          the menu, or reload to try again.
        </p>
        {error?.message && (
          <pre className="mt-4 max-w-xl overflow-x-auto rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-left text-xs text-red-700">
            {error.message}
          </pre>
        )}
        <button type="button" onClick={this.handleReload} className="btn-secondary mt-5">
          <RotateCcw size={14} /> Reload page
        </button>
      </div>
    );
  }
}
