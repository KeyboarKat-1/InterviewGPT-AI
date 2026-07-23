import React from 'react';
import { FiActivity, FiEye, FiMessageCircle, FiZap, FiVolume2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import './LiveCoachIndicators.css';

/**
 * LiveCoachIndicators — Sidebar panel showing real-time speech and facial metrics.
 * Props:
 *   speechData  — { wpm, fillerCount }
 *   facialData  — { eyeContactPercent, expression, eyeContact }
 *   isListening — boolean
 *   aiSpeaking  — boolean
 */
const EMOTION_MAP = {
  calm:    { label: 'Calm',       color: '#22c55e', emoji: '😊' },
  focused: { label: 'Focused',    color: '#3b82f6', emoji: '🎯' },
  nervous: { label: 'Nervous',    color: '#f59e0b', emoji: '😰' },
  happy:   { label: 'Happy',      color: '#a855f7', emoji: '😄' },
  away:    { label: 'Distracted', color: '#ef4444', emoji: '👀' }
};

const getConfidenceLevel = (eyeContact, expression) => {
  const eyeScore = eyeContact || 0;
  const expressionBonus = expression === 'calm' || expression === 'focused' ? 15 : 0;
  const raw = Math.min(100, eyeScore * 0.7 + expressionBonus + 25);
  return Math.round(raw);
};

const LiveCoachIndicators = ({ speechData = {}, facialData = {}, isListening = false, aiSpeaking = false }) => {
  const { wpm = 0, fillerCount = 0 } = speechData;
  const { eyeContactPercent = 0, expression = 'calm', eyeContact = true } = facialData;

  const emotion = EMOTION_MAP[expression] || EMOTION_MAP.calm;
  const confidence = getConfidenceLevel(eyeContactPercent, expression);

  const wpmStatus = wpm === 0 ? 'idle' : wpm < 90 ? 'slow' : wpm > 175 ? 'fast' : 'good';
  const wpmColor = wpmStatus === 'good' ? '#22c55e' : wpmStatus === 'idle' ? 'var(--text-secondary)' : '#f59e0b';

  const confColor = confidence >= 70 ? '#22c55e' : confidence >= 50 ? '#f59e0b' : '#ef4444';
  const eyeColor = eyeContactPercent >= 60 ? '#22c55e' : '#f59e0b';

  return (
    <div className="lci-panel glass-panel">
      {/* ── Header ── */}
      <div className="lci-header">
        <FiActivity className="lci-header-icon" />
        <span>Live Coach</span>
        <div className="lci-header-badges">
          <AnimatePresence>
            {aiSpeaking && (
              <motion.span
                className="lci-badge speaking"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <FiVolume2 size={10} /> AI
              </motion.span>
            )}
            {isListening && !aiSpeaking && (
              <motion.span
                className="lci-badge listening"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                ● LIVE
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Confidence ── */}
      <div className="lci-card">
        <div className="lci-card-header">
          <div className="lci-pulse-wrapper">
            {isListening && <span className="lci-pulse-ring" style={{ borderColor: confColor }} />}
            <FiZap size={14} color={confColor} />
          </div>
          <span>Confidence</span>
          <span className="lci-val" style={{ color: confColor }}>{confidence}%</span>
        </div>
        <div className="lci-bar-track">
          <motion.div
            className="lci-bar-fill"
            style={{ background: confColor }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
      </div>

      {/* ── Emotion ── */}
      <div className="lci-card">
        <div className="lci-card-header">
          <span className="lci-emoji">{emotion.emoji}</span>
          <span>Expression</span>
          <span className="lci-val" style={{ color: emotion.color }}>{emotion.label}</span>
        </div>
        <div className="lci-emotion-bar-track">
          <motion.div
            className="lci-emotion-fill"
            style={{ background: emotion.color }}
            animate={{ width: expression !== 'away' ? '70%' : '100%' }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* ── Eye Contact ── */}
      <div className="lci-card">
        <div className="lci-card-header">
          <FiEye size={14} color={eyeColor} />
          <span>Eye Contact</span>
          <span className="lci-val" style={{ color: eyeColor }}>{eyeContactPercent}%</span>
        </div>
        <div className="lci-bar-track">
          <motion.div
            className="lci-bar-fill"
            style={{ background: eyeColor }}
            animate={{ width: `${eyeContactPercent}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        <div className="lci-eye-indicator">
          <span className={`lci-eye-dot ${eyeContact ? 'on' : 'off'}`} />
          <span>{eyeContact ? 'Looking at camera' : 'Look at the camera'}</span>
        </div>
      </div>

      {/* ── Speaking Speed ── */}
      <div className="lci-card">
        <div className="lci-card-header">
          <FiMessageCircle size={14} color={wpmColor} />
          <span>Speaking Speed</span>
          <span className="lci-val" style={{ color: wpmColor }}>{wpm} WPM</span>
        </div>
        <div className="lci-wpm-hint">
          {wpmStatus === 'slow' && '⚡ Speak a bit faster'}
          {wpmStatus === 'fast' && '🐢 Slow down slightly'}
          {wpmStatus === 'good' && '✓ Great pace!'}
          {wpmStatus === 'idle' && 'Start speaking to measure'}
        </div>
      </div>

      {/* ── Filler Words ── */}
      <div className="lci-card">
        <div className="lci-card-header">
          <span>🚫</span>
          <span>Filler Words</span>
          <span
            className="lci-val"
            style={{ color: fillerCount === 0 ? '#22c55e' : fillerCount < 5 ? '#f59e0b' : '#ef4444' }}
          >
            {fillerCount}
          </span>
        </div>
        {fillerCount > 0 && (
          <div className="lci-wpm-hint lci-filler-hint">
            Avoid: <em>um, uh, like, you know</em>
          </div>
        )}
        {fillerCount === 0 && isListening && (
          <div className="lci-wpm-hint" style={{ color: '#22c55e' }}>
            ✓ No fillers detected!
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveCoachIndicators;
