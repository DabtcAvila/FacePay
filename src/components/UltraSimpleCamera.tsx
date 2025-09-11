'use client';

import { useState, useRef } from 'react';

type CameraState = 'idle' | 'loading' | 'active' | 'error';

export default function UltraSimpleCamera() {
  const [state, setState] = useState<CameraState>('idle');
  const [error, setError] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    setState('loading');
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setState('active');
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('No se pudo acceder a la cámara. Verifica que esté conectada y que hayas dado permisos.');
      setState('error');
    }
  };

  const useDemo = () => {
    setState('active');
    setError('');
    // Simulamos que la cámara está activa para propósitos de demo
    if (videoRef.current) {
      videoRef.current.src = '';
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setState('idle');
    setError('');
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-center">Cámara Ultra Simple</h2>
      
      {/* Video Element */}
      <div className="mb-4 bg-gray-100 rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {state === 'active' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-48 flex items-center justify-center text-gray-500">
            {state === 'loading' && 'Cargando cámara...'}
            {state === 'idle' && 'Cámara no iniciada'}
            {state === 'error' && 'Error de cámara'}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="space-y-2">
        {state === 'idle' && (
          <>
            <button
              onClick={startCamera}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Iniciar Cámara
            </button>
            <button
              onClick={useDemo}
              className="w-full py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Usar Demo
            </button>
          </>
        )}

        {state === 'loading' && (
          <button disabled className="w-full py-2 px-4 bg-gray-400 text-white rounded cursor-not-allowed">
            Cargando...
          </button>
        )}

        {state === 'active' && (
          <button
            onClick={stopCamera}
            className="w-full py-2 px-4 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Detener Cámara
          </button>
        )}

        {state === 'error' && (
          <>
            <button
              onClick={startCamera}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Intentar de Nuevo
            </button>
            <button
              onClick={useDemo}
              className="w-full py-2 px-4 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Usar Demo
            </button>
          </>
        )}
      </div>
    </div>
  );
}