import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

const NotificationBanner = () => {
  const { supported, permission, isGranted, isDenied, requestPermission } = useNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if not supported, already granted, or dismissed
  if (!supported || isGranted || dismissed) return null;

  // Don't show if denied (user made their choice)
  if (isDenied) return null;

  const handleEnable = async () => {
    await requestPermission();
  };

  return (
    <div 
      className="bg-indigo-600 text-white px-4 py-3"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm">
            Enable notifications to receive critical outbreak alerts instantly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEnable}
            className="px-4 py-1.5 bg-white text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors"
            aria-label="Enable notifications"
          >
            Enable
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 hover:bg-indigo-500 rounded-lg transition-colors"
            aria-label="Dismiss notification banner"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBanner;
