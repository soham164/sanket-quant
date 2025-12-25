import { WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

const OfflineIndicator = () => {
  const { isOnline, queueLength, syncing } = useOfflineQueue();

  if (isOnline && queueLength === 0) return null;

  return (
    <div 
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto z-50 ${
        isOnline ? 'bg-amber-600' : 'bg-red-600'
      } text-white px-4 py-2.5 rounded shadow-lg flex items-center gap-3`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Offline</p>
            <p className="text-xs opacity-80">
              {queueLength > 0 ? `${queueLength} report${queueLength > 1 ? 's' : ''} queued` : 'Reports saved locally'}
            </p>
          </div>
        </>
      ) : (
        <>
          <RefreshCw className={`w-4 h-4 flex-shrink-0 ${syncing ? 'animate-spin' : ''}`} />
          <div>
            <p className="text-sm font-medium">{syncing ? 'Syncing...' : 'Pending'}</p>
            <p className="text-xs opacity-80">{queueLength} report{queueLength > 1 ? 's' : ''} waiting</p>
          </div>
        </>
      )}
    </div>
  );
};

export default OfflineIndicator;
