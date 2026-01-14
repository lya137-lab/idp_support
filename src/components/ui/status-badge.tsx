import { cn } from '@/lib/utils';
import { ApplicationStatus } from '@/types';

interface StatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

const statusConfig: Record<ApplicationStatus, { label: string; className: string }> = {
  pending: {
    label: '대기',
    className: 'status-pending',
  },
  approved: {
    label: '승인',
    className: 'status-approved',
  },
  rejected: {
    label: '반려',
    className: 'status-rejected',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
