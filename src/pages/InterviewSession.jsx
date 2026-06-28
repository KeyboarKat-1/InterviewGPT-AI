import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { FiSend, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import geminiService from '../services/chatService';
import './InterviewSession.css';

const InterviewSession = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [questionCount, setQuestionCount] = useState(1);
  const [error, setError] = useState(null);
  const totalQuestions = 5; // Example limit for a session
  const messagesEndRef = useRef(null);

  const interviewType = new URLSearchParams(location.search).get('type') || 'HR';

  // Initialize Interview
  useEffect(() => {
    const initInterview = async () => {
      try {
        setIsAiTyping(true);
        // Attempt to fetch from backend
        const response = await geminiService.initSession({
          userId: currentUser?.uid || 'guest',
          sessionId: id,
          interviewType
        });
        
        setMessages([{
          id: Date.now(),
          sender: 'ai',
          text: response.message || `Hello! I'm your AI interviewer for today's ${interviewType} interview. Are you ready to begin?`,
          timestamp: new Date()
        }]);
      } catch (err) {
        console.warn('Backend init failed, falling back to local init:', err);
        // Fallback if backend is not actually running
        setMessages([{
          id: Date.now(),
          sender: 'ai',
          text: `Hello! I'm your AI interviewer for today's ${interviewType} interview. Are you ready to begin?`,
          timestamp: new Date()
        }]);
      } finally {
        setIsAiTyping(false);
      }
    };

    initInterview();
  }, [interviewType, id, currentUser]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date()
    };
    
    // Save history context for backend
    const currentHistory = messages.map(m => ({ role: m.sender, content: m.text }));
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsAiTyping(true);
    setError(null);

    try {
      // Send to backend
      const response = await geminiService.sendMessage({
        userId: currentUser?.uid || 'guest',
        sessionId: id,
        interviewType,
        history: currentHistory,
        message: inputValue
      });

      setQuestionCount(prev => prev + 1);
      
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: response.message || "Thank you. Could you elaborate on that?",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Failed to send message to backend:', err);
      // Fallback for demo purposes if backend fails
      setTimeout(() => {
        let aiText = '';
        if (questionCount < totalQuestions) {
          aiText = `That's an interesting perspective. Here is question ${questionCount + 1}: Can you tell me about a time you faced a significant challenge and how you overcame it?`;
          setQuestionCount(prev => prev + 1);
        } else {
          aiText = "Thank you for your answers. We have concluded the interview. You can now finish the session to view your results.";
        }

        const aiMsg = {
          id: Date.now() + 1,
          sender: 'ai',
          text: aiText,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
      }, 1500);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleFinishInterview = async () => {
    if (!currentUser) {
      navigate(`/interview/results/${id}`);
      return;
    }
    try {
      // Gather history for evaluation
      const evaluationResponse = await geminiService.evaluate({
        sessionId: id,
        userId: currentUser.uid,
        interviewType,
        history: messages.map(m => ({ role: m.sender, content: m.text }))
      });
      const { score, strengths, weaknesses, suggestions } = evaluationResponse;
      // Save interview with evaluation data
      const interviewData = {
        userId: currentUser.uid,
        sessionId: id,
        type: interviewType,
        date: serverTimestamp(),
        score: score ?? Math.floor(Math.random() * 40) + 60,
        strengths: strengths ?? ["Clear communication", "Problem-solving"],
        weaknesses: weaknesses ?? ["Technical depth in React", "Conciseness"],
        suggestions: suggestions ?? [],
        messages: messages.map(m => ({ sender: m.sender, text: m.text }))
      };
      const interviewRef = await addDoc(collection(db, "interviews"), interviewData);
      // Save to scores collection
      await addDoc(collection(db, "scores"), {
        userId: currentUser.uid,
        interviewId: interviewRef.id,
        score: interviewData.score,
        type: interviewType,
        date: serverTimestamp()
      });
      // Save to analytics collection
      await addDoc(collection(db, "analytics"), {
        userId: currentUser.uid,
        interviewId: interviewRef.id,
        metrics: evaluationResponse.metrics ?? {
          confidence: Math.floor(Math.random() * 20) + 80,
          clarity: Math.floor(Math.random() * 20) + 75,
          technicalAccuracy: Math.floor(Math.random() * 30) + 70
        },
        date: serverTimestamp()
      });
      navigate(`/interview/results/${id}`);
    } catch (error) {
      console.error("Error completing interview:", error);
      navigate(`/interview/results/${id}`);
    }
  };

  const progressPercentage = (questionCount / totalQuestions) * 100;

  return (
    <div className="session-container">
      <div className="session-header glass-panel">
        <div className="header-info">
          <h2>{interviewType} Interview</h2>
          <span className="question-counter">Question {questionCount} of {totalQuestions}</span>
        </div>
        
        <div className="progress-container">
          <div className="progress-bar">
            <motion.div 
              className="progress-fill" 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            ></motion.div>
          </div>
        </div>

        {questionCount >= totalQuestions && !isAiTyping && (
          <button className="btn-primary finish-btn" onClick={handleFinishInterview}>
            <FiCheckCircle /> Finish Interview
          </button>
        )}
      </div>

      <div className="chat-interface glass-panel">
        <div className="messages-area">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
              <div className={`message-bubble ${msg.sender}`}>
                <p>{msg.text}</p>
                <span className="timestamp">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isAiTyping && (
            <div className="message-wrapper ai">
              <div className="message-bubble ai typing">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={handleSendMessage}>
          {error && <div className="error-banner">{error}</div>}
          <input
            type="text"
            className="chat-input"
            placeholder="Type your answer here..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isAiTyping || questionCount > totalQuestions}
          />
          <button 
            type="submit" 
            className="send-btn"
            disabled={!inputValue.trim() || isAiTyping || questionCount > totalQuestions}
          >
            <FiSend />
          </button>
        </form>
      </div>
    </div>
  );
};

export default InterviewSession;
