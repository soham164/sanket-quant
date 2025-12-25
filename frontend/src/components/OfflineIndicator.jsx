import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

const OfflineIndicator = () => {
  const { isOnline, queueLength, syncing } = useOfflineQueue();

  if (isOnline && queueLength === 0) return null;

  return (
    <div 
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 ${
        isOnline ? 'bg-yellow-500' : 'bg-red-500'
      } text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3`}
      role="status"
      aria-live="polite"
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">You're offline</p>
            <p className="text-sm opacity-90">
              {queueLength > 0 
                ? `${queueLength} report${queueLength > 1 ? 's' : ''} queued for sync`
                : 'Reports will be saved locally'}
            </p>
          </div>
        </>
      ) : (
        <>
          <RefreshCw 
            className={`w-5 h-5 flex-shrink-0 ${syncing ? 'animate-spin' : ''}`} 
            aria-hidden="true" 
          />
          <div>
            <p className="font-medium">
              {syncing ? 'Syncing...' : 'Pending sync'}
            </p>
            <p className="text-sm opacity-90">
              {queueLength} report{queueLength > 1 ? 's' : ''} waiting to upload
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;
