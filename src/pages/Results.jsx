import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import { FiCheckCircle, FiAlertCircle, FiDownload, FiTrendingUp, FiArrowLeft, FiMic, FiEye } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { downloadPDFReport } from '../services/coachReportService';
import './Results.css';

const METRICS_CONFIG = [
  { key: 'technicalKnowledge', label: 'Technical Knowledge', color: '#3b82f6',  icon: '💻' },
  { key: 'communication',      label: 'Communication',       color: '#8b5cf6',  icon: '🗣️' },
  { key: 'confidence',         label: 'Confidence',          color: '#10b981',  icon: '⚡' },
  { key: 'facialExpressions',  label: 'Facial Expressions',  color: '#f59e0b',  icon: '😊' },
  { key: 'eyeContact',         label: 'Eye Contact',         color: '#ec4899',  icon: '👁️' },
  { key: 'speechFluency',      label: 'Speech Fluency',      color: '#0ea5e9',  icon: '🎙️' },
  { key: 'professionalism',    label: 'Professionalism',     color: '#a855f7',  icon: '🏆' },
  { key: 'overallPerformance', label: 'Overall Performance', color: '#22c55e',  icon: '🌟' }
];

const ScoreRing = ({ score }) => {
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Keep Practicing';
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="score-ring-wrapper">
      <svg viewBox="0 0 120 120" className="score-ring-svg">
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--border-color)" strokeWidth="10" />
        <motion.circle
          cx="60" cy="60" r="52" fill="none"
          stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="55" textAnchor="middle" fontSize="22" fontWeight="800" fill={color}>{score}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="9" fill="var(--text-secondary)">out of 100</text>
      </svg>
      <span className="score-ring-label" style={{ color }}>{label}</span>
    </div>
  );
};

const MetricBar = ({ label, value, color, icon, delay = 0 }) => (
  <div className="metric-bar-row">
    <div className="metric-bar-label">
      <span className="metric-bar-icon">{icon}</span>
      <span>{label}</span>
    </div>
    <div className="metric-bar-track">
      <motion.div
        className="metric-bar-fill"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      />
    </div>
    <span className="metric-bar-value" style={{ color }}>{value}%</span>
  </div>
);

const Results = () => {
  const { id } = useParams();
  const location = useLocation();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      // 1. Check route state first (passed directly from InterviewSession)
      if (location.state?.coachMetrics) {
        const s = location.state;
        setResult({
          type: s.type || 'Interview',
          score: s.coachMetrics?.overallPerformance ?? s.geminiEvaluation?.score ?? 70,
          coachMetrics: s.coachMetrics,
          speechAnalytics: s.speechAnalytics,
          facialAnalytics: s.facialAnalytics,
          strengths: s.geminiEvaluation?.strengths ?? [],
          weaknesses: s.geminiEvaluation?.weaknesses ?? [],
          suggestions: s.geminiEvaluation?.suggestions ?? [],
          summary: s.geminiEvaluation?.summary ?? '',
          speechFeedback: s.geminiEvaluation?.speechFeedback ?? '',
          facialFeedback: s.geminiEvaluation?.facialFeedback ?? '',
          contentFeedback: s.geminiEvaluation?.contentFeedback ?? ''
        });
        setLoading(false);
        return;
      }

      // 2. Try localStorage
      const local = JSON.parse(localStorage.getItem('localInterviews') || '[]');
      const localData = local.find(item => item.sessionId === id || item.id === id);
      if (localData) {
        setResult(localData);
        setLoading(false);
        return;
      }

      // 3. Try Firestore
      try {
        const q = query(collection(db, 'interviews'), where('sessionId', '==', id));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setResult(snap.docs[0].data());
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Firestore fetch failed:', e);
      }

      // 4. Demo fallback
      setResult({
        type: 'Demo',
        score: 85,
        coachMetrics: {
          technicalKnowledge: 82, communication: 88, confidence: 79,
          facialExpressions: 75, eyeContact: 84, speechFluency: 80,
          professionalism: 86, overallPerformance: 85
        },
        speechAnalytics: { wordsPerMinute: 138, totalWords: 412, fillerWordCount: 3, fillerWords: ['um', 'like'] },
        facialAnalytics: { eyeContactPercent: 84, dominantExpression: 'calm', expressionBreakdown: { calm: 52, focused: 30, nervous: 10, happy: 8 } },
        strengths: ['Clear communication', 'Good technical depth', 'Confident delivery'],
        weaknesses: ['Minor filler words detected', 'Some answers could be more concise'],
        suggestions: ['Practice eliminating filler words', 'Use STAR method more consistently', 'Maintain eye contact throughout'],
        summary: 'Strong performance overall. Technical answers were detailed and accurate. Communication was clear with minor room for improvement in delivery fluency.',
        speechFeedback: 'You spoke at 138 WPM — a great pace for interviews. Detected 3 filler words; try replacing them with brief pauses.',
        facialFeedback: 'Eye contact was maintained 84% of the time — excellent engagement. Dominant expression was calm and professional.',
        contentFeedback: 'Answers demonstrated solid knowledge. Continue providing concrete examples to strengthen technical responses.'
      });
      setLoading(false);
    };

    fetchResults();
  }, [id, location.state]);

  const handleDownloadPDF = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      await downloadPDFReport(result);
    } catch (e) {
      console.error('PDF generation failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="results-loading-screen">
        <div className="results-loading-ring" />
        <p>Generating your coach report…</p>
      </div>
    );
  }

  if (!result) {
    return <div className="results-error">Results not found.</div>;
  }

  const cm = result.coachMetrics || {};
  const sa = result.speechAnalytics || {};
  const fa = result.facialAnalytics || {};
  const overall = cm.overallPerformance || result.score || 0;

  // Radar chart data
  const radarData = METRICS_CONFIG.filter(m => m.key !== 'overallPerformance').map(m => ({
    subject: m.label.split(' ')[0], // Shortened label
    score: cm[m.key] || 0,
    fullMark: 100
  }));

  return (
    <div className="results-container">
      {/* Header */}
      <div className="results-header">
        <Link to="/dashboard" className="results-back-link"><FiArrowLeft /> Dashboard</Link>
        <div className="results-title-group">
          <h1>AI Coach Report</h1>
          <p className="results-subtitle">{result.type} Interview · {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <button className="results-download-btn" onClick={handleDownloadPDF} disabled={downloading}>
          <FiDownload /> {downloading ? 'Generating…' : 'Download PDF'}
        </button>
      </div>

      {/* Score + Radar */}
      <div className="results-top-grid">
        <div className="results-score-card glass-panel">
          <ScoreRing score={overall} />
          {result.summary && <p className="results-summary">{result.summary}</p>}
        </div>

        <div className="results-radar-card glass-panel">
          <h3>Performance Radar</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border-color)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 9 }} />
              <Radar
                name="Score"
                dataKey="score"
                stroke="var(--primary-color)"
                fill="var(--primary-color)"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                formatter={(value) => [`${value}%`, 'Score']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 8-Dimension Score Bars */}
      <div className="results-metrics-card glass-panel">
        <h3>8-Dimension Performance Breakdown</h3>
        <div className="metrics-bars-grid">
          {METRICS_CONFIG.map((m, i) => (
            <MetricBar
              key={m.key}
              label={m.label}
              value={cm[m.key] || 0}
              color={m.color}
              icon={m.icon}
              delay={i * 0.07}
            />
          ))}
        </div>
      </div>

      {/* Speech + Facial Analytics */}
      <div className="results-analytics-grid">
        {/* Speech Analytics */}
        <div className="results-analytics-card glass-panel">
          <h3><FiMic /> Speech Analytics</h3>
          <div className="analytics-stat-row">
            <div className="analytics-stat">
              <span className="analytics-stat-val">{sa.wordsPerMinute || 0}</span>
              <span className="analytics-stat-label">WPM</span>
            </div>
            <div className="analytics-stat">
              <span className="analytics-stat-val">{sa.totalWords || 0}</span>
              <span className="analytics-stat-label">Words</span>
            </div>
            <div className="analytics-stat" style={{ color: (sa.fillerWordCount || 0) === 0 ? '#22c55e' : (sa.fillerWordCount || 0) < 5 ? '#f59e0b' : '#ef4444' }}>
              <span className="analytics-stat-val">{sa.fillerWordCount || 0}</span>
              <span className="analytics-stat-label">Fillers</span>
            </div>
          </div>
          {sa.fillerWords?.length > 0 && (
            <div className="analytics-filler-pills">
              <span className="analytics-label-sm">Detected fillers:</span>
              {sa.fillerWords.map(fw => <span key={fw} className="filler-pill">{fw}</span>)}
            </div>
          )}
          {result.speechFeedback && <p className="analytics-feedback">{result.speechFeedback}</p>}
        </div>

        {/* Facial Analytics */}
        <div className="results-analytics-card glass-panel">
          <h3><FiEye /> Facial & Eye Contact</h3>
          <div className="analytics-stat-row">
            <div className="analytics-stat" style={{ color: (fa.eyeContactPercent || 0) >= 70 ? '#22c55e' : '#f59e0b' }}>
              <span className="analytics-stat-val">{fa.eyeContactPercent || 0}%</span>
              <span className="analytics-stat-label">Eye Contact</span>
            </div>
            <div className="analytics-stat">
              <span className="analytics-stat-val" style={{ textTransform: 'capitalize' }}>{fa.dominantExpression || 'calm'}</span>
              <span className="analytics-stat-label">Expression</span>
            </div>
          </div>
          {fa.expressionBreakdown && Object.keys(fa.expressionBreakdown).length > 0 && (
            <div className="expr-breakdown">
              {Object.entries(fa.expressionBreakdown).map(([expr, pct]) => (
                <div key={expr} className="expr-row">
                  <span className="expr-label">{expr}</span>
                  <div className="expr-bar-track">
                    <motion.div
                      className="expr-bar-fill"
                      style={{ background: expr === 'calm' ? '#22c55e' : expr === 'focused' ? '#3b82f6' : expr === 'happy' ? '#a855f7' : '#f59e0b' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, delay: 0.3 }}
                    />
                  </div>
                  <span className="expr-pct">{pct}%</span>
                </div>
              ))}
            </div>
          )}
          {result.facialFeedback && <p className="analytics-feedback">{result.facialFeedback}</p>}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="results-sw-grid">
        <div className="results-sw-card glass-panel strengths-card">
          <h3><FiCheckCircle className="icon-success" /> Strengths</h3>
          <ul className="sw-list">
            {(result.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div className="results-sw-card glass-panel weaknesses-card">
          <h3><FiAlertCircle className="icon-warning" /> Areas to Improve</h3>
          <ul className="sw-list">
            {(result.weaknesses || []).map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      {result.suggestions?.length > 0 && (
        <div className="results-recommendations glass-panel">
          <h3><FiTrendingUp className="icon-primary" /> Recommendations</h3>
          <div className="rec-grid">
            {result.suggestions.map((s, i) => (
              <div key={i} className="rec-card">
                <span className="rec-num">{i + 1}</span>
                <p>{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Feedback */}
      {result.contentFeedback && (
        <div className="results-content-feedback glass-panel">
          <h3>📝 Content Analysis</h3>
          <p>{result.contentFeedback}</p>
        </div>
      )}

      {/* Actions */}
      <div className="results-actions">
        <button className="btn-secondary" onClick={handleDownloadPDF} disabled={downloading}>
          <FiDownload /> {downloading ? 'Generating…' : 'Download PDF Report'}
        </button>
        <Link to="/interview/setup" className="btn-primary">Practice Again</Link>
        <Link to="/analytics" className="btn-secondary"><FiTrendingUp /> View All Analytics</Link>
      </div>
    </div>
  );
};

export default Results;
