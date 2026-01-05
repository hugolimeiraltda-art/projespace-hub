import { ProjectStatus, STATUS_LABELS, STATUS_COLORS } from '@/types/project';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ProjectStatus;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        colors.bg,
        colors.text,
        sizeClasses[size]
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
      {label}
    </span>
  );
}
