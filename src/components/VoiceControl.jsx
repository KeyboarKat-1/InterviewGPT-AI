import React, { useState, useEffect, useRef } from 'react';
import { FiMic, FiMicOff, FiSend } from 'react-icons/fi';
import './VoiceControl.css';

/**
 * VoiceControl — Microphone button with live transcript and fallback keyboard input.
 * Props:
 *   voiceService   — singleton from voiceService.js
 *   onAnswer(text) — called when user submits an answer
 *   disabled       — disables the component while AI is speaking
 *   aiSpeaking     — true while AI TTS is active
 */
const VoiceControl = ({ voiceService, onAnswer, disabled = false, aiSpeaking = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [finalText, setFinalText] = useState('');
  const [textInput, setTextInput] = useState('');
  const [fillerCount, setFillerCount] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [mode, setMode] = useState('voice'); // 'voice' | 'keyboard'
  const [permissionError, setPermissionError] = useState('');
  const transcriptRef = useRef(null);

  useEffect(() => {
    if (!voiceService) return;

    voiceService.onTranscriptUpdate = ({ final, interim, fillerCount: fc, wpm: w }) => {
      setFinalText(final);
      setLiveTranscript(interim);
      setFillerCount(fc);
      setWpm(w);
    };

    voiceService.onListeningChange = (val) => setIsListening(val);

    voiceService.onError = (err) => {
      if (err === 'not-allowed') {
        setPermissionError('Microphone access denied. Please allow microphone access or use keyboard mode.');
      }
    };

    return () => {
      voiceService.onTranscriptUpdate = null;
      voiceService.onListeningChange = null;
      voiceService.onError = null;
    };
  }, [voiceService]);

  const handleMicToggle = () => {
    if (!voiceService?.isSpeechSupported()) {
      setPermissionError('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      setMode('keyboard');
      return;
    }
    if (isListening) {
      voiceService.stopListening();
    } else {
      const started = voiceService.startListening();
      if (!started) {
        setPermissionError('Could not start microphone. Please check browser permissions.');
      }
    }
  };

  const handleSubmitVoice = () => {
    const answer = finalText.trim() || liveTranscript.trim();
    if (!answer) return;
    voiceService?.stopListening();
    voiceService?.resetTranscript();
    setFinalText('');
    setLiveTranscript('');
    setFillerCount(0);
    setWpm(0);
    onAnswer(answer);
  };

  const handleSubmitKeyboard = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    onAnswer(textInput.trim());
    setTextInput('');
  };

  return (
    <div className="voice-control">
      {permissionError && (
        <div className="vc-permission-error">
          ⚠️ {permissionError}
          <button onClick={() => { setPermissionError(''); setMode('keyboard'); }}>Use Keyboard</button>
        </div>
      )}

      <div className="vc-mode-tabs">
        <button className={`vc-tab ${mode === 'voice' ? 'active' : ''}`} onClick={() => setMode('voice')}>
          <FiMic /> Voice
        </button>
        <button className={`vc-tab ${mode === 'keyboard' ? 'active' : ''}`} onClick={() => setMode('keyboard')}>
          <FiSend /> Keyboard
        </button>
      </div>

      {mode === 'voice' ? (
        <div className="vc-voice-panel">
          {/* Transcript area */}
          <div className="vc-transcript" ref={transcriptRef}>
            {(finalText || liveTranscript) ? (
              <>
                <span className="vc-final">{finalText}</span>
                <span className="vc-interim">{liveTranscript}</span>
              </>
            ) : (
              <span className="vc-placeholder">
                {aiSpeaking ? '🔊 AI is speaking...' : isListening ? 'Listening... speak your answer' : 'Press the mic to start answering'}
              </span>
            )}
          </div>

          {/* Metrics bar */}
          {(isListening || finalText) && (
            <div className="vc-metrics-bar">
              <span className="vc-metric"><span className="vc-dot green" />WPM: <strong>{wpm}</strong></span>
              <span className="vc-metric"><span className="vc-dot orange" />Fillers: <strong>{fillerCount}</strong></span>
            </div>
          )}

          {/* Buttons */}
          <div className="vc-controls">
            <button
              className={`vc-mic-btn ${isListening ? 'listening' : ''}`}
              onClick={handleMicToggle}
              disabled={disabled || aiSpeaking}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              <div className="vc-mic-rings">
                <div className="vc-ring r1" />
                <div className="vc-ring r2" />
                <div className="vc-ring r3" />
              </div>
              {isListening ? <FiMicOff size={24} /> : <FiMic size={24} />}
            </button>

            <button
              className="vc-submit-btn"
              onClick={handleSubmitVoice}
              disabled={disabled || aiSpeaking || (!finalText && !liveTranscript)}
            >
              Submit Answer <FiSend />
            </button>
          </div>
        </div>
      ) : (
        <form className="vc-keyboard-panel" onSubmit={handleSubmitKeyboard}>
          <textarea
            className="vc-keyboard-input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your answer here..."
            disabled={disabled || aiSpeaking}
            rows={4}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitKeyboard(e);
              }
            }}
          />
          <button
            type="submit"
            className="vc-submit-btn"
            disabled={disabled || aiSpeaking || !textInput.trim()}
          >
            Submit Answer <FiSend />
          </button>
        </form>
      )}
    </div>
  );
};

export default VoiceControl;
