import React, { useEffect, useRef, useState } from 'react';
import { FiCamera, FiCameraOff, FiMinimize2, FiMaximize2 } from 'react-icons/fi';
import './WebcamMonitor.css';

/**
 * WebcamMonitor — PiP-style webcam feed with live eye contact and expression overlays.
 * Props:
 *   facialService  — singleton from facialAnalysisService.js
 *   onData(data)   — called on each facial analysis update
 */
const EXPRESSION_EMOJI = {
  calm: '😊',
  focused: '🎯',
  nervous: '😰',
  happy: '😄',
  away: '👀'
};

const WebcamMonitor = ({ facialService, onData }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [facialData, setFacialData] = useState({
    faceDetected: false,
    eyeContact: true,
    expression: 'calm',
    eyeContactPercent: 0
  });

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user' },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = async () => {
          await videoRef.current.play();
          setCameraActive(true);
          // Initialize facial analysis
          if (facialService) {
            const ok = await facialService.init(videoRef.current, (data) => {
              setFacialData(data);
              if (onData) onData(data);
            });
            if (ok) facialService.start();
          }
        };
      }
    } catch (err) {
      console.warn('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access denied.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found.');
      } else {
        setCameraError('Camera unavailable.');
      }
    }
  };

  const stopCamera = () => {
    if (facialService) {
      facialService.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  if (cameraError) {
    return (
      <div className="webcam-monitor error-state">
        <FiCameraOff size={24} style={{ marginBottom: '8px', color: 'var(--danger-color)' }} />
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Camera Blocked</span>
        <span style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '4px', lineHeight: 1.4 }}>
          {cameraError === 'Camera access denied.' 
            ? 'Please click the camera icon in your address bar to allow access.' 
            : cameraError}
        </span>
        <button 
          onClick={() => { setCameraError(''); startCamera(); }}
          style={{
            marginTop: '12px',
            padding: '6px 12px',
            background: 'var(--surface-color)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '0.75rem',
            cursor: 'pointer'
          }}
        >
          Retry Camera
        </button>
      </div>
    );
  }

  return (
    <div className={`webcam-monitor ${minimized ? 'minimized' : ''}`}>
      <div className="webcam-header">
        <span className={`webcam-status-dot ${cameraActive ? 'active' : ''}`} />
        <span className="webcam-label">Camera</span>
        <button className="webcam-minimize-btn" onClick={() => setMinimized(!minimized)}>
          {minimized ? <FiMaximize2 size={12} /> : <FiMinimize2 size={12} />}
        </button>
      </div>

      {!minimized && (
        <>
          <div className="webcam-feed-wrapper">
            <video
              ref={videoRef}
              className="webcam-feed"
              muted
              playsInline
              autoPlay
            />
            {/* Eye contact indicator */}
            <div className={`webcam-overlay-badge eye-badge ${facialData.eyeContact ? 'good' : 'bad'}`}>
              {facialData.eyeContact ? '👁 On' : '👁 Off'}
            </div>
            {/* Expression badge */}
            <div className="webcam-overlay-badge expr-badge">
              {EXPRESSION_EMOJI[facialData.expression] || '😊'} {facialData.expression}
            </div>
          </div>

          <div className="webcam-stats">
            <div className="webcam-stat">
              <span className="ws-label">Eye Contact</span>
              <div className="ws-bar">
                <div
                  className="ws-fill"
                  style={{
                    width: `${facialData.eyeContactPercent || 0}%`,
                    background: (facialData.eyeContactPercent || 0) >= 60 ? '#22c55e' : '#f59e0b'
                  }}
                />
              </div>
              <span className="ws-val">{facialData.eyeContactPercent || 0}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WebcamMonitor;
