import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { FiArrowLeft, FiTrendingUp, FiStar, FiPercent, FiMic, FiEye, FiActivity } from 'react-icons/fi';
import { motion } from 'framer-motion';
import './Analytics.css';

const COACH_METRICS_CONFIG = [
  { key: 'technicalKnowledge', label: 'Technical Knowledge', short: 'Technical', color: '#3b82f6' },
  { key: 'communication',      label: 'Communication',       short: 'Comm.',     color: '#8b5cf6' },
  { key: 'confidence',         label: 'Confidence',          short: 'Confid.',   color: '#10b981' },
  { key: 'facialExpressions',  label: 'Facial Expressions',  short: 'Facial',    color: '#f59e0b' },
  { key: 'eyeContact',         label: 'Eye Contact',         short: 'Eye',       color: '#ec4899' },
  { key: 'speechFluency',      label: 'Speech Fluency',      short: 'Fluency',   color: '#0ea5e9' },
  { key: 'professionalism',    label: 'Professionalism',     short: 'Prof.',     color: '#a855f7' },
  { key: 'overallPerformance', label: 'Overall Performance', short: 'Overall',   color: '#22c55e' }
];

const Analytics = () => {
  const { currentUser } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [averageScore, setAverageScore] = useState(0);
  const [avgMetrics, setAvgMetrics] = useState({});
  const [avgSpeech, setAvgSpeech] = useState({ wpm: 0, fillerCount: 0 });
  const [avgEyeContact, setAvgEyeContact] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let all = [];

        // 1. localStorage
        const local = JSON.parse(localStorage.getItem('localInterviews') || '[]');
        all = [...local];

        // 2. Firestore
        if (currentUser && !currentUser.isGuest) {
          try {
            const q = query(
              collection(db, 'interviews'),
              where('userId', '==', currentUser.uid),
              orderBy('date', 'desc')
            );
            const snap = await getDocs(q);
            const fsInterviews = snap.docs.map(d => {
              const data = d.data();
              return {
                id: d.id,
                ...data,
                date: data.date?.toDate ? data.date.toDate().toISOString() : data.date
              };
            });
            const existingIds = new Set(all.map(i => i.sessionId));
            fsInterviews.forEach(item => {
              if (!existingIds.has(item.sessionId)) all.push(item);
            });
          } catch (e) {
            console.warn('Firestore fetch failed:', e);
          }
        }

        all.sort((a, b) => new Date(a.date) - new Date(b.date));
        setInterviews(all);

        if (all.length > 0) {
          const totalScore = all.reduce((acc, i) => acc + (i.score || 0), 0);
          setAverageScore(Math.round(totalScore / all.length));

          // Aggregate coach metrics
          const metricTotals = {};
          COACH_METRICS_CONFIG.forEach(m => { metricTotals[m.key] = 0; });
          let speechWpmTotal = 0, speechFillerTotal = 0, eyeTotal = 0;
          let speechCount = 0, facialCount = 0;

          all.forEach(interview => {
            const cm = interview.coachMetrics || interview.metrics || {};
            COACH_METRICS_CONFIG.forEach(m => {
              metricTotals[m.key] += cm[m.key] || cm.confidence || (interview.score * 0.9) || 70;
            });

            if (interview.speechAnalytics?.wordsPerMinute) {
              speechWpmTotal += interview.speechAnalytics.wordsPerMinute;
              speechFillerTotal += interview.speechAnalytics.fillerWordCount || 0;
              speechCount++;
            }
            if (interview.facialAnalytics?.eyeContactPercent != null) {
              eyeTotal += interview.facialAnalytics.eyeContactPercent;
              facialCount++;
            }
          });

          const computed = {};
          COACH_METRICS_CONFIG.forEach(m => {
            computed[m.key] = Math.round(metricTotals[m.key] / all.length);
          });
          setAvgMetrics(computed);

          if (speechCount > 0) {
            setAvgSpeech({ wpm: Math.round(speechWpmTotal / speechCount), fillerCount: Math.round(speechFillerTotal / speechCount) });
          }
          if (facialCount > 0) {
            setAvgEyeContact(Math.round(eyeTotal / facialCount));
          }
        }
      } catch (e) {
        console.error('Analytics fetch error:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="analytics-loading-screen">
        <div className="analytics-loading-ring" />
        <p>Loading performance analytics…</p>
      </div>
    );
  }

  const highestScore = interviews.length > 0 ? Math.max(...interviews.map(i => i.score || 0)) : 0;
  const totalSessions = interviews.length;

  // Line chart — score trend
  const scoreTrendData = interviews.map((iv, idx) => ({
    name: `S${idx + 1}`,
    date: new Date(iv.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    score: iv.score || 0,
    eyeContact: iv.coachMetrics?.eyeContact || iv.facialAnalytics?.eyeContactPercent || 0,
    fluency: iv.coachMetrics?.speechFluency || 0
  }));

  // Bar chart — 8-dimension averages
  const barChartData = COACH_METRICS_CONFIG.map(m => ({
    name: m.short,
    value: avgMetrics[m.key] || 0,
    fill: m.color
  }));

  // Radar chart
  const radarData = COACH_METRICS_CONFIG.filter(m => m.key !== 'overallPerformance').map(m => ({
    subject: m.short,
    score: avgMetrics[m.key] || 0,
    fullMark: 100
  }));

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <Link to="/dashboard" className="analytics-back-link"><FiArrowLeft /> Dashboard</Link>
        <div>
          <h1>Performance Analytics</h1>
          <p>Insights from your AI coach sessions over time</p>
        </div>
      </div>

      {interviews.length > 0 ? (
        <>
          {/* ── Summary Stats ── */}
          <div className="analytics-stats-grid">
            {[
              { icon: <FiPercent />, label: 'Average Score', value: `${averageScore}%`, color: '#3b82f6' },
              { icon: <FiTrendingUp />, label: 'Total Sessions', value: totalSessions, color: '#8b5cf6' },
              { icon: <FiStar />, label: 'Highest Score', value: `${highestScore}%`, color: '#22c55e' },
              { icon: <FiMic />, label: 'Avg. WPM', value: avgSpeech.wpm || '—', color: '#0ea5e9' },
              { icon: <FiEye />, label: 'Avg. Eye Contact', value: `${avgEyeContact || 0}%`, color: '#ec4899' },
              { icon: <FiActivity />, label: 'Avg. Fillers / Session', value: avgSpeech.fillerCount || 0, color: '#f59e0b' }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="analytics-stat-card glass-panel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div className="stat-icon-circle" style={{ background: `${stat.color}22`, color: stat.color }}>
                  {stat.icon}
                </div>
                <div className="stat-card-body">
                  <p className="stat-label">{stat.label}</p>
                  <p className="stat-value" style={{ color: stat.color }}>{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ── Score Trend ── */}
          <div className="analytics-chart-card glass-panel">
            <h2>Score Trend</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={scoreTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v, n) => [`${v}%`, n === 'score' ? 'Overall' : n === 'eyeContact' ? 'Eye Contact' : 'Fluency']}
                  labelFormatter={(_, items) => items?.[0]?.payload?.date}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="score" name="Overall Score" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 }} />
                <Line type="monotone" dataKey="eyeContact" name="Eye Contact" stroke="#ec4899" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} />
                <Line type="monotone" dataKey="fluency" name="Speech Fluency" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="3 3" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ── Competency Bar + Radar ── */}
          <div className="analytics-charts-row">
            <div className="analytics-chart-card glass-panel">
              <h2>8-Dimension Averages</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barChartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} stroke="var(--text-secondary)" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(v) => [`${v}%`, 'Avg. Score']}
                  />
                  <Bar dataKey="value" name="Score %">
                    {barChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="analytics-chart-card glass-panel">
              <h2>Skill Radar</h2>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="var(--border-color)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fill: 'var(--text-secondary)', fontSize: 8 }} angle={30} />
                  <Radar name="Avg. Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.28} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(v) => [`${v}%`, 'Avg. Score']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Detailed Metric Progress Bars ── */}
          <div className="analytics-details-card glass-panel">
            <h2>Detailed Metric Breakdown</h2>
            <div className="analytics-metric-bars">
              {COACH_METRICS_CONFIG.map((m, i) => (
                <div key={m.key} className="analytics-metric-row">
                  <span className="analytics-metric-label">{m.label}</span>
                  <div className="analytics-metric-track">
                    <motion.div
                      className="analytics-metric-fill"
                      style={{ background: m.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${avgMetrics[m.key] || 0}%` }}
                      transition={{ duration: 0.7, delay: i * 0.06 }}
                    />
                  </div>
                  <span className="analytics-metric-val" style={{ color: m.color }}>
                    {avgMetrics[m.key] || 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="analytics-empty glass-panel">
          <p>No completed interviews found.</p>
          <p>Take your first AI coach interview to see your analytics here.</p>
          <Link to="/interview/setup" className="btn-primary">Start Your First Interview</Link>
        </div>
      )}
    </div>
  );
};

export default Analytics;
