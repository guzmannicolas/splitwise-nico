import React, { useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

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

  // Si no es soportado, no mostrar el componente
  if (!isSupported) {
    return null;
  }

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔔</span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Notificaciones Push
              </h3>
              <p className="text-sm text-gray-500">
                {isSubscribed
                  ? 'Recibirás notificaciones de gastos y liquidaciones'
                  : 'Activa para recibir notificaciones en tiempo real'}
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
            ${isSubscribed ? 'bg-indigo-600' : 'bg-gray-300'}
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

      {/* Estado del permiso */}
      {permission === 'denied' && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Permiso denegado
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Has bloqueado las notificaciones. Para activarlas:
                </p>
                <ol className="mt-2 ml-4 list-decimal">
                  <li>Haz clic en el ícono de candado en la barra de dirección</li>
                  <li>Busca "Notificaciones" y selecciona "Permitir"</li>
                  <li>Recarga la página</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Error</h3>
              <div className="mt-2 text-sm text-yellow-700">
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
          <span className="ml-2 text-sm text-gray-500">Procesando...</span>
        </div>
      )}

      {/* Detalles expandibles */}
      {isSubscribed && (
        <div className="mt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {showDetails ? '▼ Ocultar detalles' : '▶ Ver detalles'}
          </button>

          {showDetails && (
            <div className="mt-3 text-sm text-gray-600 space-y-2">
              <p className="flex items-center gap-2">
                <span className="font-semibold">Estado:</span>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                  Activo
                </span>
              </p>
              <p>
                <span className="font-semibold">Recibirás notificaciones cuando:</span>
              </p>
              <ul className="ml-4 list-disc space-y-1">
                <li>Se agregue un nuevo gasto a tus grupos</li>
                <li>Alguien registre una liquidación</li>
                <li>Te inviten a un nuevo grupo</li>
                <li>Se modifique un gasto existente</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Información adicional para no suscritos */}
      {!isSubscribed && permission !== 'denied' && !isLoading && (
        <div className="mt-4 text-sm text-gray-500">
          <p className="flex items-center gap-2">
            <span>💡</span>
            <span>Las notificaciones funcionan incluso cuando la app está cerrada</span>
          </p>
        </div>
      )}
    </div>
  );
}
