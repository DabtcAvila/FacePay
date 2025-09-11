'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface WorkingFaceIDProps {
  onScanComplete?: () => void;
}

export default function WorkingFaceID({ onScanComplete }: WorkingFaceIDProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [error, setError] = useState<string>('');
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      setError('');
      setIsStarted(true);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: 640, 
          height: 480, 
          facingMode: 'user' 
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
        await videoRef.current.play();
      }
    } catch (err) {
      setError('Error accessing camera: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsStarted(false);
    }
  };

  const skipAuthentication = () => {
    // Stop camera if running
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onScanComplete?.();
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsStarted(false);
    setError('');
  };

  return (
    <div className="max-w-md mx-auto p-6 text-center">
      <h2 className="text-xl font-bold mb-6">Face ID Test</h2>
      
      {!isStarted && !error && (
        <Button onClick={startCamera} className="mb-4">
          Start Camera
        </Button>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
          <div className="mt-2">
            <Button onClick={startCamera} variant="outline" size="sm" className="mr-2">
              Try Again
            </Button>
            <Button onClick={skipAuthentication} variant="outline" size="sm">
              Skip
            </Button>
          </div>
        </div>
      )}

      {isStarted && !error && (
        <div className="space-y-4">
          <div className="bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
            />
          </div>
          
          <div className="space-x-2">
            <Button onClick={stopCamera} variant="outline" size="sm">
              Stop
            </Button>
            <Button onClick={skipAuthentication} size="sm">
              Skip
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}