import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMessageSquare, FiTrendingUp, FiFileText } from 'react-icons/fi';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        <motion.div 
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="hero-title">
            Master your interviews with <br/>
            <span className="gradient-text">AI-Powered</span> Precision
          </h1>
          <p className="hero-subtitle">
            Practice with our intelligent AI interviewer. Get real-time feedback, personalized questions, and analytics to land your dream job.
          </p>
          <div className="hero-buttons">
            <Link to="/register" className="btn-primary" style={{padding: '16px 32px', fontSize: '1.1rem'}}>Start Practicing Free</Link>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Why choose InterviewGPT AI?</h2>
        <div className="features-grid">
          <motion.div 
            className="feature-card glass-panel"
            whileHover={{ y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="feature-icon"><FiMessageSquare /></div>
            <h3>Realistic AI Chat</h3>
            <p>Experience interview scenarios like HR, Technical, and Behavioral rounds with our advanced conversational AI.</p>
          </motion.div>

          <motion.div 
            className="feature-card glass-panel"
            whileHover={{ y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="feature-icon"><FiFileText /></div>
            <h3>Resume-Based Questions</h3>
            <p>Upload your resume and the AI will tailor the interview questions specifically to your skills and experience.</p>
          </motion.div>

          <motion.div 
            className="feature-card glass-panel"
            whileHover={{ y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="feature-icon"><FiTrendingUp /></div>
            <h3>In-Depth Analytics</h3>
            <p>Track your progress over time with detailed scores, strengths, weaknesses, and personalized improvement suggestions.</p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
