import { cn } from '../../utils/helpers';

/** Wraps wide tables for horizontal scroll on mobile/tablet. */
export default function TableScroll({ children, className }) {
  return <div className={cn('table-scroll', className)}>{children}</div>;
}
