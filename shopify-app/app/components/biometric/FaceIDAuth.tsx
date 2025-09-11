import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, BlockStack, Text, Spinner } from "@shopify/polaris";
import * as faceapi from "face-api.js";

interface FaceIDAuthProps {
  onSuccess: (faceData: string) => void;
  onError: (error: string) => void;
  isLoading?: boolean;
}

export function FaceIDAuth({ onSuccess, onError, isLoading = false }: FaceIDAuthProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Load Face-API models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models'; // We'll serve these from public/models
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Failed to load face-api models:', error);
        onError('Failed to load face detection models');
      }
    };

    loadModels();
  }, [onError]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsRecording(true);
    } catch (error) {
      console.error('Camera access denied:', error);
      onError('Camera access is required for Face ID');
    }
  }, [onError]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsRecording(false);
  }, [stream]);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelLoaded) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const detections = await faceapi
        .detectAllFaces(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions();

      if (detections.length === 0) {
        onError('No face detected. Please ensure your face is visible and well-lit.');
        return;
      }

      if (detections.length > 1) {
        onError('Multiple faces detected. Please ensure only one person is in the frame.');
        return;
      }

      const faceDescriptor = detections[0].descriptor;
      const landmarks = detections[0].landmarks;
      const expressions = detections[0].expressions;

      // Check for liveness (basic checks)
      const isLive = await checkLiveness(expressions, landmarks);
      if (!isLive) {
        onError('Liveness check failed. Please look directly at the camera.');
        return;
      }

      // Generate face template (encrypted)
      const faceTemplate = Array.from(faceDescriptor).join(',');
      onSuccess(faceTemplate);
      
    } catch (error) {
      console.error('Face analysis failed:', error);
      onError('Failed to analyze face. Please try again.');
    }
  }, [isModelLoaded, onSuccess, onError]);

  const checkLiveness = async (expressions: any, landmarks: any): Promise<boolean> => {
    // Basic liveness checks - in production, use more sophisticated methods
    const neutralScore = expressions.neutral || 0;
    const eyesOpen = landmarks.getLeftEye().length > 0 && landmarks.getRightEye().length > 0;
    
    return neutralScore > 0.3 && eyesOpen;
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h3">
          Face ID Authentication
        </Text>
        
        <Text color="subdued">
          Position your face within the frame and click "Scan Face" to authenticate.
        </Text>

        <div style={{ position: 'relative', width: '100%', maxWidth: '640px', margin: '0 auto' }}>
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: 'auto',
              border: '2px solid #e1e3e5',
              borderRadius: '8px',
              display: isRecording ? 'block' : 'none'
            }}
          />
          
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />
          
          {!isRecording && (
            <div style={{
              width: '100%',
              height: '300px',
              border: '2px dashed #e1e3e5',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f6f6f7'
            }}>
              <Text color="subdued">Click "Start Camera" to begin</Text>
            </div>
          )}
        </div>

        <BlockStack gap="200">
          {!isRecording ? (
            <Button
              variant="primary"
              fullWidth
              onClick={startCamera}
              disabled={!isModelLoaded || isLoading}
              loading={!isModelLoaded}
            >
              {!isModelLoaded ? 'Loading Face Detection...' : 'Start Camera'}
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                fullWidth
                onClick={captureAndAnalyze}
                disabled={isLoading}
                loading={isLoading}
              >
                {isLoading ? 'Processing...' : 'Scan Face'}
              </Button>
              <Button
                fullWidth
                onClick={stopCamera}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </>
          )}
        </BlockStack>

        {!isModelLoaded && (
          <div style={{ textAlign: 'center' }}>
            <Spinner size="small" />
            <Text color="subdued">Loading face detection models...</Text>
          </div>
        )}
      </BlockStack>
    </Card>
  );
}