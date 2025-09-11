'use client';

import React, { useState, useEffect } from 'react';

type FaceIDState = 'scanning' | 'processing' | 'success' | 'error';

interface FaceIDAnimationProps {
  onStateChange?: (state: FaceIDState) => void;
  autoProgress?: boolean;
  className?: string;
}

const FaceIDAnimation: React.FC<FaceIDAnimationProps> = ({
  onStateChange,
  autoProgress = false,
  className = ''
}) => {
  const [state, setState] = useState<FaceIDState>('scanning');

  useEffect(() => {
    if (onStateChange) {
      onStateChange(state);
    }
  }, [state, onStateChange]);

  useEffect(() => {
    if (!autoProgress) return;

    const progressTimer = setTimeout(() => {
      switch (state) {
        case 'scanning':
          setState('processing');
          break;
        case 'processing':
          setState('success');
          break;
        default:
          break;
      }
    }, state === 'scanning' ? 3000 : 2000);

    return () => clearTimeout(progressTimer);
  }, [state, autoProgress]);

  const reset = () => {
    setState('scanning');
  };

  const triggerError = () => {
    setState('error');
    setTimeout(() => setState('scanning'), 2000);
  };

  return (
    <div className={`face-id-container ${className}`}>
      <div className="relative flex items-center justify-center">
        {/* Main Face Outline */}
        <div className={`face-outline ${state}`}>
          <svg
            width="200"
            height="240"
            viewBox="0 0 200 240"
            className="face-svg"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Face Shape */}
            <path
              d="M100 20 C140 20, 160 50, 160 90 C160 130, 160 160, 140 180 C120 200, 80 200, 60 180 C40 160, 40 130, 40 90 C40 50, 60 20, 100 20 Z"
              className={`face-path ${state}`}
              fill="none"
              strokeWidth="3"
            />
            
            {/* Eyes */}
            <circle cx="75" cy="85" r="6" className={`eye left-eye ${state}`} />
            <circle cx="125" cy="85" r="6" className={`eye right-eye ${state}`} />
            
            {/* Nose */}
            <path
              d="M100 95 L95 105 L100 110 L105 105 Z"
              className={`nose ${state}`}
              fill="none"
              strokeWidth="2"
            />
            
            {/* Mouth */}
            <path
              d="M85 125 Q100 135 115 125"
              className={`mouth ${state}`}
              fill="none"
              strokeWidth="2"
            />
          </svg>

          {/* Scanning Grid */}
          <div className={`scanning-grid ${state}`}>
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className={`grid-line ${state}`}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  top: `${15 + i * 12}%`
                }}
              />
            ))}
          </div>

          {/* Detection Points */}
          <div className={`detection-points ${state}`}>
            <div className="point point-1" />
            <div className="point point-2" />
            <div className="point point-3" />
            <div className="point point-4" />
            <div className="point point-5" />
            <div className="point point-6" />
            <div className="point point-7" />
            <div className="point point-8" />
          </div>

          {/* Scanning Ring */}
          <div className={`scanning-ring ${state}`} />
          
          {/* Processing Spinner */}
          {state === 'processing' && (
            <div className="processing-overlay">
              <div className="processing-spinner" />
              <div className="processing-dots">
                <div className="dot" />
                <div className="dot" />
                <div className="dot" />
              </div>
            </div>
          )}

          {/* Success Checkmark */}
          {state === 'success' && (
            <div className="success-overlay">
              <svg
                width="60"
                height="60"
                viewBox="0 0 60 60"
                className="success-checkmark"
              >
                <circle
                  cx="30"
                  cy="30"
                  r="25"
                  fill="none"
                  stroke="hsl(var(--facepay-green))"
                  strokeWidth="3"
                  className="success-circle"
                />
                <path
                  d="M18 30 L25 37 L42 20"
                  fill="none"
                  stroke="hsl(var(--facepay-green))"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="success-path"
                />
              </svg>
            </div>
          )}

          {/* Error X */}
          {state === 'error' && (
            <div className="error-overlay">
              <svg
                width="60"
                height="60"
                viewBox="0 0 60 60"
                className="error-x"
              >
                <circle
                  cx="30"
                  cy="30"
                  r="25"
                  fill="none"
                  stroke="hsl(var(--facepay-red))"
                  strokeWidth="3"
                  className="error-circle"
                />
                <path
                  d="M20 20 L40 40 M40 20 L20 40"
                  stroke="hsl(var(--facepay-red))"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="error-path"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="status-text">
          {state === 'scanning' && 'Position your face in the frame'}
          {state === 'processing' && 'Processing facial data...'}
          {state === 'success' && 'Face ID verified successfully!'}
          {state === 'error' && 'Face ID verification failed'}
        </div>
      </div>

      {/* Control Buttons (for demo purposes) */}
      <div className="control-buttons">
        <button onClick={() => setState('scanning')} className="btn-control scanning">
          Scan
        </button>
        <button onClick={() => setState('processing')} className="btn-control processing">
          Process
        </button>
        <button onClick={() => setState('success')} className="btn-control success">
          Success
        </button>
        <button onClick={triggerError} className="btn-control error">
          Error
        </button>
        <button onClick={reset} className="btn-control reset">
          Reset
        </button>
      </div>

      <style jsx>{`
        .face-id-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          padding: 2rem;
          max-width: 400px;
          margin: 0 auto;
        }

        .face-outline {
          position: relative;
          width: 200px;
          height: 240px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .face-svg {
          position: absolute;
          z-index: 1;
        }

        /* Face Path Animations */
        .face-path {
          stroke: hsl(var(--biometric-scan));
          transition: all 0.3s ease;
        }

        .face-path.scanning {
          stroke: hsl(var(--biometric-scan));
          stroke-dasharray: 20, 10;
          animation: dash-scanning 2s linear infinite;
        }

        .face-path.processing {
          stroke: hsl(var(--facepay-orange));
          stroke-dasharray: none;
        }

        .face-path.success {
          stroke: hsl(var(--biometric-success));
          stroke-dasharray: none;
        }

        .face-path.error {
          stroke: hsl(var(--biometric-error));
          stroke-dasharray: none;
          animation: shake 0.6s ease-in-out;
        }

        /* Eyes Animation */
        .eye {
          fill: hsl(var(--biometric-scan));
          transition: all 0.3s ease;
        }

        .eye.scanning {
          fill: hsl(var(--biometric-scan));
          animation: blink 3s infinite;
        }

        .eye.processing {
          fill: hsl(var(--facepay-orange));
        }

        .eye.success {
          fill: hsl(var(--biometric-success));
        }

        .eye.error {
          fill: hsl(var(--biometric-error));
        }

        /* Nose and Mouth */
        .nose, .mouth {
          stroke: hsl(var(--biometric-scan));
          transition: all 0.3s ease;
        }

        .nose.processing, .mouth.processing {
          stroke: hsl(var(--facepay-orange));
        }

        .nose.success, .mouth.success {
          stroke: hsl(var(--biometric-success));
        }

        .nose.error, .mouth.error {
          stroke: hsl(var(--biometric-error));
        }

        /* Scanning Grid */
        .scanning-grid {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          z-index: 2;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .scanning-grid.scanning {
          opacity: 1;
        }

        .grid-line {
          position: absolute;
          left: 20%;
          right: 20%;
          height: 2px;
          background: linear-gradient(90deg, 
            transparent, 
            hsl(var(--biometric-scan)), 
            transparent
          );
          animation: scan-line 3s infinite;
        }

        /* Detection Points */
        .detection-points {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          z-index: 3;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .detection-points.scanning {
          opacity: 1;
        }

        .point {
          position: absolute;
          width: 8px;
          height: 8px;
          background: hsl(var(--biometric-scan));
          border-radius: 50%;
          animation: pulse-point 2s infinite;
        }

        .point-1 { top: 15%; left: 37%; animation-delay: 0s; }
        .point-2 { top: 15%; right: 37%; animation-delay: 0.2s; }
        .point-3 { top: 30%; left: 30%; animation-delay: 0.4s; }
        .point-4 { top: 30%; right: 30%; animation-delay: 0.6s; }
        .point-5 { top: 45%; left: 45%; animation-delay: 0.8s; }
        .point-6 { top: 45%; right: 45%; animation-delay: 1s; }
        .point-7 { top: 65%; left: 35%; animation-delay: 1.2s; }
        .point-8 { top: 65%; right: 35%; animation-delay: 1.4s; }

        /* Scanning Ring */
        .scanning-ring {
          position: absolute;
          width: 220px;
          height: 260px;
          border: 3px solid hsl(var(--biometric-scan) / 0.3);
          border-radius: 50%;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 0;
          opacity: 0;
          transition: all 0.3s ease;
        }

        .scanning-ring.scanning {
          opacity: 1;
          animation: ring-pulse 2s infinite;
        }

        .scanning-ring.processing {
          opacity: 1;
          border-color: hsl(var(--facepay-orange) / 0.3);
          animation: ring-spin 1s linear infinite;
        }

        .scanning-ring.success {
          opacity: 1;
          border-color: hsl(var(--biometric-success) / 0.5);
          animation: ring-success 0.6s ease-out;
        }

        .scanning-ring.error {
          opacity: 1;
          border-color: hsl(var(--biometric-error) / 0.5);
          animation: ring-error 0.6s ease-out;
        }

        /* Processing Overlay */
        .processing-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 4;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .processing-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid hsl(var(--facepay-orange) / 0.3);
          border-top: 3px solid hsl(var(--facepay-orange));
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .processing-dots {
          display: flex;
          gap: 4px;
        }

        .processing-dots .dot {
          width: 8px;
          height: 8px;
          background: hsl(var(--facepay-orange));
          border-radius: 50%;
          animation: bounce-dot 1.4s infinite;
        }

        .processing-dots .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .processing-dots .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        /* Success Overlay */
        .success-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 4;
        }

        .success-checkmark {
          animation: scale-in 0.6s ease-out;
        }

        .success-circle {
          stroke-dasharray: 157;
          stroke-dashoffset: 157;
          animation: draw-circle 0.6s ease-out forwards;
        }

        .success-path {
          stroke-dasharray: 25;
          stroke-dashoffset: 25;
          animation: draw-path 0.4s ease-out 0.3s forwards;
        }

        /* Error Overlay */
        .error-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 4;
        }

        .error-x {
          animation: scale-in 0.6s ease-out;
        }

        .error-circle {
          stroke-dasharray: 157;
          stroke-dashoffset: 157;
          animation: draw-circle-error 0.6s ease-out forwards;
        }

        .error-path {
          stroke-dasharray: 28;
          stroke-dashoffset: 28;
          animation: draw-path-error 0.4s ease-out 0.3s forwards;
        }

        /* Status Text */
        .status-text {
          text-align: center;
          font-size: 1.1rem;
          font-weight: 500;
          color: hsl(var(--foreground));
          min-height: 1.5rem;
          transition: all 0.3s ease;
        }

        /* Control Buttons */
        .control-buttons {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 1rem;
        }

        .btn-control {
          padding: 0.5rem 1rem;
          border: 2px solid transparent;
          border-radius: 0.5rem;
          background: hsl(var(--muted));
          color: hsl(var(--muted-foreground));
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-control:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .btn-control.scanning {
          border-color: hsl(var(--biometric-scan));
          color: hsl(var(--biometric-scan));
        }

        .btn-control.processing {
          border-color: hsl(var(--facepay-orange));
          color: hsl(var(--facepay-orange));
        }

        .btn-control.success {
          border-color: hsl(var(--biometric-success));
          color: hsl(var(--biometric-success));
        }

        .btn-control.error {
          border-color: hsl(var(--biometric-error));
          color: hsl(var(--biometric-error));
        }

        .btn-control.reset {
          border-color: hsl(var(--primary));
          color: hsl(var(--primary));
        }

        /* Animations */
        @keyframes dash-scanning {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: 30;
          }
        }

        @keyframes scan-line {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          50% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(10px);
          }
        }

        @keyframes pulse-point {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
        }

        @keyframes ring-pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.05);
            opacity: 0.6;
          }
        }

        @keyframes ring-spin {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        @keyframes ring-success {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.5;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.5;
          }
        }

        @keyframes ring-error {
          0%, 100% {
            transform: translate(-50%, -50%) translateX(0);
          }
          25% {
            transform: translate(-50%, -50%) translateX(-10px);
          }
          75% {
            transform: translate(-50%, -50%) translateX(10px);
          }
        }

        @keyframes blink {
          0%, 90%, 100% {
            transform: scaleY(1);
          }
          95% {
            transform: scaleY(0.1);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce-dot {
          0%, 80%, 100% {
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @keyframes scale-in {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes draw-circle {
          0% {
            stroke-dashoffset: 157;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes draw-path {
          0% {
            stroke-dashoffset: 25;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes draw-circle-error {
          0% {
            stroke-dashoffset: 157;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes draw-path-error {
          0% {
            stroke-dashoffset: 28;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .face-id-container {
            padding: 1rem;
            gap: 1.5rem;
          }

          .face-outline {
            width: 160px;
            height: 192px;
          }

          .face-svg {
            width: 160px;
            height: 192px;
          }

          .scanning-ring {
            width: 180px;
            height: 210px;
          }

          .status-text {
            font-size: 1rem;
          }

          .control-buttons {
            gap: 0.25rem;
          }

          .btn-control {
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default FaceIDAnimation;