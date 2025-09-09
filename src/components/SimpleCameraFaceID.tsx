'use client';

import React, { useState, useRef, useCallback } from 'react';

interface SimpleCameraFaceIDProps {
  onImageCapture?: (imageBase64: string) => void;
  onError?: (error: string) => void;
}

const SimpleCameraFaceID: React.FC<SimpleCameraFaceIDProps> = ({
  onImageCapture,
  onError
}) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error accessing camera';
      onError?.(errorMessage);
      console.error('Error accessing camera:', err);
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
    setIsCapturing(false);
    setCountdown(0);
    setCapturedImage(null);
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    let count = 3;
    setCountdown(count);

    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count === 0) {
        clearInterval(timer);
        
        // Capture the image
        const video = videoRef.current!;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageBase64);
        onImageCapture?.(imageBase64);
        setIsCapturing(false);
      }
    }, 1000);
  }, [onImageCapture]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setIsCapturing(false);
    setCountdown(0);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="relative">
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-80 h-60 bg-gray-900 rounded-lg ${!isStreaming ? 'hidden' : ''}`}
        />
        
        {/* Camera Placeholder */}
        {!isStreaming && (
          <div className="w-80 h-60 bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-400">
              <div className="text-4xl mb-2">📹</div>
              <div>Camera not started</div>
            </div>
          </div>
        )}
        
        {/* Face Guide Overlay */}
        {isStreaming && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-40 h-40 border-2 border-white border-dashed rounded-full opacity-70">
              <div className="absolute inset-2 border border-white rounded-full opacity-50"></div>
            </div>
          </div>
        )}
        
        {/* Countdown Overlay */}
        {isCapturing && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="text-6xl font-bold text-white animate-pulse">
              {countdown}
            </div>
          </div>
        )}
        
        {/* Captured Image */}
        {capturedImage && (
          <div className="absolute inset-0">
            <img 
              src={capturedImage} 
              alt="Captured"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="flex space-x-4">
        {!isStreaming ? (
          <button
            onClick={startCamera}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Iniciar Cámara
          </button>
        ) : (
          <>
            {!capturedImage ? (
              <>
                <button
                  onClick={captureImage}
                  disabled={isCapturing}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors"
                >
                  {isCapturing ? `Capturando... ${countdown}` : 'Capturar Imagen'}
                </button>
                <button
                  onClick={stopCamera}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Detener Cámara
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={retakePhoto}
                  className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  Tomar Otra
                </button>
                <button
                  onClick={stopCamera}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Finalizar
                </button>
              </>
            )}
          </>
        )}
      </div>
      
      {/* Hidden Canvas for Image Capture */}
      <canvas
        ref={canvasRef}
        className="hidden"
      />
      
      {/* Status Info */}
      <div className="text-sm text-gray-600 text-center max-w-md">
        {!isStreaming && "Haz clic en 'Iniciar Cámara' para comenzar"}
        {isStreaming && !isCapturing && !capturedImage && "Posiciona tu cara dentro del círculo y haz clic en 'Capturar Imagen'"}
        {isCapturing && "Mantente quieto, capturando en..."}
        {capturedImage && "Imagen capturada! Puedes tomar otra o finalizar."}
      </div>
    </div>
  );
};

export default SimpleCameraFaceID;