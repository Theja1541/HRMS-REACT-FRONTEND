import { cn } from '../../utils/helpers';

/** Horizontally scrollable tab bar for mobile/tablet. */
export default function ScrollTabs({ children, className }) {
  return (
    <div className={cn('scroll-tabs border-b border-slate-200', className)}>
      {children}
    </div>
  );
}
