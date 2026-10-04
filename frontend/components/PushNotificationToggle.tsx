import React, { useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function PushNotificationToggle() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    permission,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [showDetails, setShowDetails] = useState(false);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  // If not supported, do not render the component
  if (!isSupported) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-6 border border-gray-200 dark:border-slate-800 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                Push Notifications
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {isSubscribed
                  ? 'You will receive notifications for expenses and settlements'
                  : 'Enable to receive real-time notifications'}
              </p>
            </div>
          </div>
        </div>

        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          disabled={isLoading || permission === 'denied'}
          className={`
            relative inline-flex h-8 w-14 items-center rounded-full transition-colors
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isSubscribed ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-slate-700'}
          `}
        >
          <span
            className={`
              inline-block h-6 w-6 transform rounded-full bg-white transition-transform
              ${isSubscribed ? 'translate-x-7' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Permission status */}
      {permission === 'denied' && (
        <div className="mt-4 rounded-md bg-red-50 dark:bg-red-900/10 p-4 border border-red-100 dark:border-red-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                Permission denied
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>
                  You have blocked notifications. To enable them:
                </p>
                <ol className="mt-2 ml-4 list-decimal">
                  <li>Click the lock icon in the address bar</li>
                  <li>Find &quot;Notifications&quot; and select &quot;Allow&quot;</li>
                  <li>Reload the page</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-md bg-yellow-50 dark:bg-yellow-900/10 p-4 border border-yellow-100 dark:border-yellow-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Error</h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="mt-4 flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-sm text-gray-500 dark:text-slate-400">Processing...</span>
        </div>
      )}

      {/* Expandable details */}
      {isSubscribed && (
        <div className="mt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          >
            {showDetails ? '▼ Hide details' : '▶ Show details'}
          </button>

          {showDetails && (
            <div className="mt-3 text-sm text-gray-600 dark:text-slate-300 space-y-2 transition-all">
              <p className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-slate-100">Status:</span>
                <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-400">
                  Active
                </span>
              </p>
              <p>
                <span className="font-semibold text-gray-900 dark:text-slate-100">You will receive notifications when:</span>
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>A new expense is added to your groups</li>
                <li>Someone records a settlement</li>
                <li>You are invited to a new group</li>
                <li>An existing expense is modified</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Additional info for non-subscribers */}
      {!isSubscribed && permission !== 'denied' && !isLoading && (
        <div className="mt-4 text-sm text-gray-500 dark:text-slate-400">
          <p className="flex items-center gap-2">
            <span>💡</span>
            <span>Notifications work even when the app is closed</span>
          </p>
        </div>
      )}
    </div>
  );
}
