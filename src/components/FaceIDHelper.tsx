'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Users, 
  Lightbulb, 
  Eye, 
  Camera, 
  Info,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import type { FaceIDError } from '@/services/realFaceID';

interface FaceIDHelperProps {
  error?: FaceIDError;
  tips?: boolean;
  className?: string;
}

export default function FaceIDHelper({ error, tips = false, className }: FaceIDHelperProps) {
  const getErrorContent = (errorType: FaceIDError) => {
    switch (errorType) {
      case 'NO_FACE_DETECTED':
        return {
          icon: Eye,
          color: 'orange',
          title: 'No Face Detected',
          message: 'Position your face in the camera frame',
          instructions: [
            'Look directly at the camera',
            'Move closer to the camera',
            'Ensure your entire face is visible',
            'Remove any obstructions'
          ]
        };
        
      case 'MULTIPLE_FACES_DETECTED':
        return {
          icon: Users,
          color: 'yellow',
          title: 'Multiple Faces Detected',
          message: 'Only one person should be visible',
          instructions: [
            'Ensure you are alone in the frame',
            'Ask others to step out of view',
            'Check for reflections behind you',
            'Use a plain background'
          ]
        };
        
      case 'LOW_CONFIDENCE':
        return {
          icon: AlertTriangle,
          color: 'red',
          title: 'Low Recognition Confidence',
          message: 'Face verification confidence too low',
          instructions: [
            'Improve lighting conditions',
            'Look directly at camera',
            'Remove glasses if needed',
            'Clean camera lens'
          ]
        };
        
      case 'POOR_IMAGE_QUALITY':
        return {
          icon: Camera,
          color: 'amber',
          title: 'Poor Image Quality',
          message: 'Camera image is too dark or blurry',
          instructions: [
            'Improve lighting in the room',
            'Clean your camera lens',
            'Hold device steady',
            'Move to a well-lit area'
          ]
        };
        
      case 'CAMERA_ACCESS_DENIED':
        return {
          icon: XCircle,
          color: 'red',
          title: 'Camera Access Denied',
          message: 'Please allow camera access',
          instructions: [
            'Click the camera icon in browser bar',
            'Select "Allow" for camera permission',
            'Refresh the page if needed',
            'Check browser settings'
          ]
        };
        
      case 'LIVENESS_CHECK_FAILED':
        return {
          icon: Eye,
          color: 'red',
          title: 'Liveness Check Failed',
          message: 'Please look directly at the camera',
          instructions: [
            'Blink naturally while looking at camera',
            'Avoid using photos or videos',
            'Keep your eyes open and visible',
            'Move slightly if prompted'
          ]
        };
        
      case 'USER_NOT_ENROLLED':
        return {
          icon: Info,
          color: 'blue',
          title: 'Face ID Not Set Up',
          message: 'Complete enrollment to use Face ID',
          instructions: [
            'Click "Enroll Face ID" button',
            'Follow the enrollment process',
            'Ensure good lighting during setup',
            'Complete all enrollment steps'
          ]
        };
        
      default:
        return {
          icon: AlertTriangle,
          color: 'gray',
          title: 'Face ID Error',
          message: 'An error occurred with Face ID',
          instructions: [
            'Check your camera connection',
            'Try again in better lighting',
            'Restart your browser if needed',
            'Contact support if issue persists'
          ]
        };
    }
  };

  const generalTips = [
    {
      icon: Lightbulb,
      title: 'Good Lighting',
      description: 'Face the light source for better recognition'
    },
    {
      icon: Eye,
      title: 'Direct Gaze',
      description: 'Look directly at the camera lens'
    },
    {
      icon: Camera,
      title: 'Proper Distance',
      description: 'Position face 18-24 inches from camera'
    },
    {
      icon: CheckCircle2,
      title: 'Stay Still',
      description: 'Keep your head steady during scanning'
    }
  ];

  if (tips && !error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`space-y-3 ${className || ''}`}
      >
        <div className="text-center">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Face ID Tips for Best Results
          </h4>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {generalTips.map((tip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center"
            >
              <tip.icon className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <h5 className="text-xs font-medium text-blue-900 mb-1">
                {tip.title}
              </h5>
              <p className="text-xs text-blue-700">
                {tip.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (!error) return null;

  const errorContent = getErrorContent(error);
  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800'
  };

  const iconColorClasses = {
    red: 'text-red-600',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    gray: 'text-gray-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${colorClasses[errorContent.color as keyof typeof colorClasses]} border rounded-lg p-4 space-y-3 ${className || ''}`}
    >
      {/* Error Header */}
      <div className="flex items-center space-x-2">
        <errorContent.icon className={`w-5 h-5 ${iconColorClasses[errorContent.color as keyof typeof iconColorClasses]}`} />
        <div>
          <h4 className="text-sm font-medium">{errorContent.title}</h4>
          <p className="text-xs opacity-90">{errorContent.message}</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium opacity-90">Try these steps:</h5>
        <ul className="space-y-1">
          {errorContent.instructions.map((instruction, index) => (
            <motion.li
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start space-x-2 text-xs"
            >
              <span className="inline-block w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0" />
              <span className="opacity-80">{instruction}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}