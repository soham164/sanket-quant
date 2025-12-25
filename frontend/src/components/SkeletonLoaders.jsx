// Skeleton loader components - Professional design system

export const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-surface-300 rounded ${className}`} />
);

export const CardSkeleton = () => (
  <div className="card p-4">
    <div className="flex items-center justify-between mb-3">
      <div>
        <SkeletonPulse className="h-3 w-20 mb-2" />
        <SkeletonPulse className="h-6 w-12" />
      </div>
      <SkeletonPulse className="h-6 w-6 rounded" />
    </div>
  </div>
);

export const StatCardSkeleton = () => (
  <div className="card p-4">
    <SkeletonPulse className="h-2.5 w-16 mb-2" />
    <SkeletonPulse className="h-7 w-12 mb-1" />
    <SkeletonPulse className="h-2 w-20" />
  </div>
);

export const AlertSkeleton = () => (
  <div className="p-4 border-b border-border">
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <SkeletonPulse className="h-4 w-20" />
          <SkeletonPulse className="h-4 w-12 rounded" />
        </div>
        <SkeletonPulse className="h-3 w-32 mb-1" />
        <SkeletonPulse className="h-2.5 w-24" />
      </div>
      <SkeletonPulse className="h-8 w-20 rounded" />
    </div>
  </div>
);

export const VillageCardSkeleton = () => (
  <div className="card p-4">
    <div className="flex items-start justify-between mb-3">
      <div>
        <SkeletonPulse className="h-4 w-20 mb-1" />
        <SkeletonPulse className="h-2.5 w-12" />
      </div>
      <SkeletonPulse className="h-4 w-12 rounded" />
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <SkeletonPulse className="h-2.5 w-16" />
        <SkeletonPulse className="h-3 w-8" />
      </div>
      <SkeletonPulse className="h-1 w-full rounded-full" />
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <SkeletonPulse className="h-2.5 w-14" />
        <SkeletonPulse className="h-4 w-4" />
      </div>
    </div>
  </div>
);

export const TableRowSkeleton = ({ columns = 4 }) => (
  <tr>
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <SkeletonPulse className="h-3 w-full" />
      </td>
    ))}
  </tr>
);

export const CommunicationSkeleton = () => (
  <div className="p-3 border-b border-border">
    <div className="flex items-center gap-2 mb-1.5">
      <SkeletonPulse className="h-3 w-16" />
      <SkeletonPulse className="h-3 w-3" />
      <SkeletonPulse className="h-3 w-16" />
      <SkeletonPulse className="h-4 w-20 rounded" />
    </div>
    <SkeletonPulse className="h-10 w-full rounded" />
    <SkeletonPulse className="h-2 w-12 mt-1" />
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
    <div className="card">
      <div className="p-4 border-b border-border">
        <SkeletonPulse className="h-4 w-28" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => <AlertSkeleton key={i} />)}
      </div>
    </div>
  </div>
);

export const MapSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => <VillageCardSkeleton key={i} />)}
    </div>
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <SkeletonPulse className="h-4 w-36" />
        <div className="flex items-center gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <SkeletonPulse className="h-2.5 w-2.5 rounded" />
              <SkeletonPulse className="h-2.5 w-10" />
            </div>
          ))}
        </div>
      </div>
      <SkeletonPulse className="h-80 w-full rounded" />
    </div>
  </div>
);
