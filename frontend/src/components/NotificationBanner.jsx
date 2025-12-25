import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationBanner = () => {
  const { supported, permission, isGranted, isDenied, requestPermission } = useNotifications();
  const [dismissed, setDismissed] = useState(false);

  if (!supported || isGranted || dismissed || isDenied) return null;

  return (
    <div className="bg-primary text-text-inverse px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-accent" />
          <p className="text-xs">Enable notifications for critical outbreak alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={requestPermission} className="btn btn-accent text-xs py-1.5 px-3">
            Enable
          </button>
          <button onClick={() => setDismissed(true)} className="p-1 hover:bg-white/10 rounded transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner;
