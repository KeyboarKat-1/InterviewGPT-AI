import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import geminiService from '../services/chatService';
import voiceService from '../services/voiceService';
import facialAnalysisService from '../services/facialAnalysisService';
import { computeCoachMetrics } from '../services/coachReportService';
import { saveCoachSession } from '../services/firebaseService';
import VoiceControl from '../components/VoiceControl';
import WebcamMonitor from '../components/WebcamMonitor';
import LiveCoachIndicators from '../components/LiveCoachIndicators';
import './InterviewSession.css';

const InterviewSession = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Core chat state
  const [messages, setMessages] = useState([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const [error, setError] = useState(null);
  const totalQuestions = 5;
  const messagesEndRef = useRef(null);

  // AI speaking state
  const [aiSpeaking, setAiSpeaking] = useState(false);

  // Live coach data
  const [speechData, setSpeechData] = useState({ wpm: 0, fillerCount: 0 });
  const [facialData, setFacialData] = useState({
    faceDetected: false,
    eyeContact: true,
    expression: 'calm',
    eyeContactPercent: 0
  });
  const [isListening, setIsListening] = useState(false);

  // Finish state
  const [isFinishing, setIsFinishing] = useState(false);

  const interviewType = new URLSearchParams(location.search).get('type') || 'HR';
  const resumeText = location.state?.resumeText || null;

  // ─── Speak AI message via TTS ────────────────────
  const speakAIMessage = useCallback((text) => {
    setAiSpeaking(true);
    voiceService.speak(text, () => setAiSpeaking(false));
  }, []);

  // ─── Initialize Interview ─────────────────────────
  useEffect(() => {
    const initInterview = async () => {
      try {
        setIsAiTyping(true);
        const response = await geminiService.initSession({
          userId: currentUser?.uid || 'guest',
          sessionId: id,
          interviewType,
          resumeText,
          questionCount: totalQuestions,
          difficulty: 'Medium'
        });

        const firstMsg = {
          id: Date.now(),
          sender: 'ai',
          text: response.message || `Hello! I'm your AI interviewer for today's ${interviewType} interview. Are you ready to begin?`,
          timestamp: new Date()
        };
        setMessages([firstMsg]);
        speakAIMessage(firstMsg.text);
      } catch (err) {
        console.warn('Backend init failed, using local fallback:', err);
        const fallbackText = `Hello! I'm your AI interviewer for today's ${interviewType} interview. Are you ready to begin?`;
        setMessages([{ id: Date.now(), sender: 'ai', text: fallbackText, timestamp: new Date() }]);
        speakAIMessage(fallbackText);
      } finally {
        setIsAiTyping(false);
      }
    };

    // Wire up voiceService callbacks
    voiceService.onTranscriptUpdate = ({ final, interim, fillerCount: fc, wpm: w }) => {
      setSpeechData({ wpm: w, fillerCount: fc, finalText: final, interimText: interim });
    };
    voiceService.onListeningChange = (val) => setIsListening(val);

    initInterview();

    return () => {
      voiceService.cancelSpeech();
      voiceService.stopListening();
      facialAnalysisService.stop();
    };
  }, [interviewType, id, currentUser, resumeText, speakAIMessage]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);

  // ─── Handle Answer Submission ─────────────────────
  const handleSendMessage = useCallback(async (answerText) => {
    if (!answerText?.trim() || isFinishing) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: answerText,
      timestamp: new Date()
    };

    const currentHistory = messages.map(m => ({ role: m.sender, content: m.text }));

    setMessages(prev => [...prev, userMsg]);
    setIsAiTyping(true);
    setError(null);

    try {
      const response = await geminiService.sendMessage({
        userId: currentUser?.uid || 'guest',
        sessionId: id,
        interviewType,
        history: currentHistory,
        message: answerText,
        resumeText,
        questionNumber: questionCount,
        totalQuestions
      });

      setQuestionCount(prev => prev + 1);

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: response.message || 'Thank you. Could you elaborate on that?',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
      speakAIMessage(aiMsg.text);
    } catch (err) {
      console.error('Backend message failed:', err);
      const qNum = questionCount + 1;
      let aiText = qNum <= totalQuestions
        ? `Interesting perspective! Question ${qNum}: Can you tell me about a challenge you faced and how you overcame it?`
        : 'Thank you for all your answers. You can now finish the session to view your detailed coach report.';

      setQuestionCount(prev => prev + 1);
      const aiMsg = { id: Date.now() + 1, sender: 'ai', text: aiText, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      speakAIMessage(aiMsg.text);
    } finally {
      setIsAiTyping(false);
    }
  }, [messages, questionCount, isFinishing, currentUser, id, interviewType, resumeText, speakAIMessage]);

  // ─── Finish Interview & Generate Report ──────────
  const handleFinishInterview = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    voiceService.cancelSpeech();
    voiceService.stopListening();
    facialAnalysisService.stop();

    try {
      const speechMetrics = voiceService.getSpeechMetrics();
      const facialAnalytics = facialAnalysisService.getAnalyticsSummary();
      const history = messages.map(m => ({ role: m.sender, content: m.text }));

      // Call enhanced evaluate-coach endpoint
      let geminiEvaluation;
      try {
        geminiEvaluation = await geminiService.evaluateCoach({
          interviewType,
          history,
          speechMetrics,
          facialAnalytics
        });
      } catch {
        // Fallback to basic evaluate
        try {
          geminiEvaluation = await geminiService.evaluate({ sessionId: id, userId: currentUser?.uid, interviewType, history });
        } catch {
          geminiEvaluation = { score: 70, strengths: [], weaknesses: [], suggestions: [], metrics: {} };
        }
      }

      // Compute 8-dimension coach metrics
      const coachMetrics = computeCoachMetrics(geminiEvaluation, speechMetrics, facialAnalytics);

      // Persist to Firestore or localStorage
      if (currentUser && !currentUser.isGuest) {
        try {
          await saveCoachSession(currentUser.uid, {
            sessionId: id,
            type: interviewType,
            messages,
            geminiEvaluation,
            coachMetrics,
            speechAnalytics: speechMetrics,
            facialAnalytics
          });
        } catch (dbErr) {
          console.warn('Firestore save failed, persisting to localStorage:', dbErr);
          _saveLocal({ sessionId: id, type: interviewType, messages, geminiEvaluation, coachMetrics, speechAnalytics: speechMetrics, facialAnalytics });
        }
      } else {
        _saveLocal({ sessionId: id, type: interviewType, messages, geminiEvaluation, coachMetrics, speechAnalytics: speechMetrics, facialAnalytics });
      }

      navigate(`/interview/results/${id}`, {
        state: { geminiEvaluation, coachMetrics, speechAnalytics: speechMetrics, facialAnalytics, type: interviewType }
      });
    } catch (err) {
      console.error('Error finishing interview:', err);
      navigate(`/interview/results/${id}`);
    }
  };

  const _saveLocal = (data) => {
    const local = JSON.parse(localStorage.getItem('localInterviews') || '[]');
    local.unshift({ ...data, id, date: new Date().toISOString(), score: data.coachMetrics?.overallPerformance ?? 70 });
    localStorage.setItem('localInterviews', JSON.stringify(local));
  };

  const progressPercentage = Math.min(100, (questionCount / totalQuestions) * 100);
  const isInterviewComplete = questionCount > totalQuestions;

  return (
    <div className="coach-session-layout">

      {/* ── Left Sidebar: Webcam + Live Coach ── */}
      <aside className="coach-sidebar">
        <WebcamMonitor
          facialService={facialAnalysisService}
          onData={(data) => setFacialData(data)}
        />
        <LiveCoachIndicators
          speechData={speechData}
          facialData={facialData}
          isListening={isListening}
          aiSpeaking={aiSpeaking}
        />
      </aside>

      {/* ── Center: Interview Chat ── */}
      <main className="coach-main">
        {/* Header */}
        <div className="coach-header glass-panel">
          <div className="coach-header-top">
            <div className="coach-header-info">
              <h2 className="coach-title">{interviewType} Interview</h2>
              <span className="coach-question-counter">
                Question {Math.min(questionCount, totalQuestions)} of {totalQuestions}
              </span>
            </div>
            <div className="coach-header-badges">
              {aiSpeaking && (
                <span className="coach-badge speaking-badge">🔊 AI Speaking</span>
              )}
              {isListening && (
                <span className="coach-badge listening-badge">🎙 Listening</span>
              )}
            </div>
          </div>
          <div className="coach-progress-bar">
            <motion.div
              className="coach-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="coach-messages glass-panel">
          <div className="coach-messages-scroll">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  className={`coach-msg-wrapper ${msg.sender}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`coach-msg-avatar ${msg.sender}`}>
                    {msg.sender === 'ai' ? '🤖' : '👤'}
                  </div>
                  <div className={`coach-msg-bubble ${msg.sender}`}>
                    <p>{msg.text}</p>
                    <span className="coach-msg-time">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isAiTyping && (
              <motion.div className="coach-msg-wrapper ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="coach-msg-avatar ai">🤖</div>
                <div className="coach-msg-bubble ai typing">
                  <div className="dot" /><div className="dot" /><div className="dot" />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="coach-error-banner">
            <FiAlertTriangle /> {error}
          </div>
        )}

        {/* Voice / Input Control */}
        <div className="coach-input-area">
          {isInterviewComplete ? (
            <motion.button
              className="coach-finish-btn"
              onClick={handleFinishInterview}
              disabled={isFinishing}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {isFinishing ? (
                <><span className="spinner-inline" />Generating Coach Report…</>
              ) : (
                <><FiCheckCircle /> Finish & View Coach Report</>
              )}
            </motion.button>
          ) : (
            <VoiceControl
              voiceService={voiceService}
              onAnswer={handleSendMessage}
              disabled={isAiTyping || isFinishing}
              aiSpeaking={aiSpeaking}
            />
          )}
        </div>
      </main>

      {/* ── Right Panel: Tips ── */}
      <aside className="coach-tips">
        <div className="tips-panel glass-panel">
          <h4>💡 Interview Tips</h4>
          <ul className="tips-list">
            <li>Maintain eye contact with the camera</li>
            <li>Speak clearly at 120–160 WPM</li>
            <li>Avoid filler words: <em>um, uh, like</em></li>
            <li>Use the STAR method for examples</li>
            <li>Pause before answering to collect thoughts</li>
            <li>Smile naturally — it signals confidence</li>
          </ul>

          <div className="session-progress-summary">
            <h4>Session Progress</h4>
            <div className="progress-steps">
              {Array.from({ length: totalQuestions }, (_, i) => (
                <div
                  key={i}
                  className={`progress-step ${i < questionCount - 1 ? 'done' : i === questionCount - 1 ? 'current' : 'pending'}`}
                >
                  {i < questionCount - 1 ? '✓' : i + 1}
                </div>
              ))}
            </div>
          </div>

          {isInterviewComplete && !isFinishing && (
            <motion.button
              className="tips-finish-btn"
              onClick={handleFinishInterview}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FiCheckCircle /> Finish Interview
            </motion.button>
          )}
        </div>
      </aside>
    </div>
  );
};

export default InterviewSession;
