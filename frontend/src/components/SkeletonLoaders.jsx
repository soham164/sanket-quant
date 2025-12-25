// Skeleton loader components for better perceived performance

export const SkeletonPulse = ({ className = '' }) => (
  <div 
    className={`animate-pulse bg-gray-200 rounded ${className}`}
    aria-hidden="true"
  />
);

export const CardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm p-6" aria-busy="true" aria-label="Loading content">
    <div className="flex items-center justify-between mb-4">
      <div>
        <SkeletonPulse className="h-4 w-24 mb-2" />
        <SkeletonPulse className="h-8 w-16" />
      </div>
      <SkeletonPulse className="h-8 w-8 rounded-full" />
    </div>
  </div>
);

export const StatCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-gray-200" aria-busy="true">
    <div className="flex items-center justify-between">
      <div>
        <SkeletonPulse className="h-3 w-20 mb-2" />
        <SkeletonPulse className="h-8 w-12" />
      </div>
      <SkeletonPulse className="h-8 w-8 rounded" />
    </div>
  </div>
);

export const AlertSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm p-6" aria-busy="true" aria-label="Loading alert">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <SkeletonPulse className="h-6 w-16 rounded-full" />
          <SkeletonPulse className="h-6 w-20 rounded-full" />
        </div>
        <SkeletonPulse className="h-5 w-32 mb-2" />
        <SkeletonPulse className="h-4 w-48 mb-2" />
        <SkeletonPulse className="h-3 w-24" />
      </div>
      <SkeletonPulse className="h-10 w-24 rounded-lg" />
    </div>
  </div>
);

export const VillageCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm p-6" aria-busy="true" aria-label="Loading village data">
    <div className="flex items-start justify-between mb-4">
      <div>
        <SkeletonPulse className="h-5 w-24 mb-2" />
        <SkeletonPulse className="h-3 w-16" />
      </div>
      <SkeletonPulse className="h-3 w-3 rounded-full" />
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonPulse className="h-3 w-16" />
        <SkeletonPulse className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <SkeletonPulse className="h-3 w-24" />
        <SkeletonPulse className="h-4 w-8" />
      </div>
      <SkeletonPulse className="h-2 w-full rounded-full" />
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <SkeletonPulse className="h-3 w-28" />
        <SkeletonPulse className="h-6 w-6" />
      </div>
    </div>
  </div>
);

export const TableRowSkeleton = ({ columns = 4 }) => (
  <tr aria-busy="true">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <SkeletonPulse className="h-4 w-full" />
      </td>
    ))}
  </tr>
);

export const CommunicationSkeleton = () => (
  <div className="p-4 border-b" aria-busy="true" aria-label="Loading communication">
    <div className="flex items-center gap-2 mb-2">
      <SkeletonPulse className="h-4 w-20" />
      <SkeletonPulse className="h-4 w-4" />
      <SkeletonPulse className="h-4 w-20" />
      <SkeletonPulse className="h-5 w-24 rounded" />
    </div>
    <SkeletonPulse className="h-12 w-full rounded" />
    <SkeletonPulse className="h-3 w-16 mt-2" />
  </div>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    <div className="bg-white rounded-xl shadow-sm p-6">
      <SkeletonPulse className="h-6 w-48 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <AlertSkeleton key={i} />
        ))}
      </div>
    </div>
  </div>
);

export const MapSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm p-6" aria-busy="true" aria-label="Loading map">
    <SkeletonPulse className="h-6 w-32 mb-4" />
    <SkeletonPulse className="h-96 w-full rounded-lg" />
    <div className="mt-4 flex items-center justify-center gap-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <SkeletonPulse className="h-4 w-4 rounded-full" />
          <SkeletonPulse className="h-3 w-16" />
        </div>
      ))}
    </div>
  </div>
);
