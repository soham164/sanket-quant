import { useState, useEffect, useCallback } from 'react';

// Check if notifications are supported
const isSupported = () => 'Notification' in window && 'serviceWorker' in navigator;

// Permission states
const PERMISSION = {
  GRANTED: 'granted',
  DENIED: 'denied',
  DEFAULT: 'default',
};

export const useNotifications = () => {
  const [permission, setPermission] = useState(PERMISSION.DEFAULT);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(isSupported());
    if (isSupported()) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === PERMISSION.GRANTED;
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      return false;
    }
  }, [supported]);

  const sendNotification = useCallback(async (title, options = {}) => {
    if (!supported || permission !== PERMISSION.GRANTED) {
      console.warn('Notifications not available or not permitted');
      return null;
    }

    try {
      // Try to use service worker for better reliability
      const registration = await navigator.serviceWorker?.ready;
      
      if (registration) {
        return registration.showNotification(title, {
          icon: '/icon.svg',
          badge: '/icon.svg',
          vibrate: [200, 100, 200],
          requireInteraction: options.requireInteraction || false,
          ...options,
        });
      }

      // Fallback to regular notification
      return new Notification(title, {
        icon: '/icon.svg',
        ...options,
      });
    } catch (err) {
      console.error('Failed to send notification:', err);
      return null;
    }
  }, [supported, permission]);

  const sendAlertNotification = useCallback((alert) => {
    const severityEmoji = {
      high: '🚨',
      critical: '🚨',
      medium: '⚠️',
      low: 'ℹ️',
    };

    return sendNotification(
      `${severityEmoji[alert.severity] || '📢'} Sanket Alert: ${alert.village}`,
      {
        body: `${alert.symptom}\nConfidence: ${(alert.confidence * 100).toFixed(0)}%`,
        tag: `alert-${alert.id}`,
        requireInteraction: alert.severity === 'high' || alert.severity === 'critical',
        data: { alertId: alert.id, village: alert.village },
      }
    );
  }, [sendNotification]);

  return {
    supported,
    permission,
    isGranted: permission === PERMISSION.GRANTED,
    isDenied: permission === PERMISSION.DENIED,
    requestPermission,
    sendNotification,
    sendAlertNotification,
  };
};

export default useNotifications;
