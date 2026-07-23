import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { FiPlayCircle, FiBarChart2, FiClock, FiFileText, FiMic } from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (currentUser) {
          // Fetch from local storage first
          const localInterviews = JSON.parse(localStorage.getItem('localInterviews') || '[]');
          let interviews = [...localInterviews];
          
          if (!currentUser.isGuest) {
            try {
              // Fetch user profile stats
              const userRef = doc(db, 'users', currentUser.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                setUserData(userSnap.data());
              }

              // Fetch recent interviews from Firestore
              const interviewsRef = collection(db, 'interviews');
              const q = query(
                interviewsRef, 
                where('userId', '==', currentUser.uid),
                orderBy('date', 'desc'),
                limit(3)
              );
              const querySnapshot = await getDocs(q);
              const firestoreInterviews = [];
              querySnapshot.forEach((doc) => {
                const data = doc.data();
                firestoreInterviews.push({ 
                  id: doc.id, 
                  ...data,
                  date: data.date
                });
              });

              // Merge lists and prevent duplicates
              const localSessionIds = new Set(interviews.map(i => i.sessionId));
              firestoreInterviews.forEach(item => {
                if (!localSessionIds.has(item.sessionId)) {
                  interviews.push(item);
                }
              });
            } catch (dbError) {
              console.warn("Firestore fetch failed in dashboard:", dbError);
            }
          }

          // Format dates and sort by date descending
          interviews.forEach(item => {
            if (item.date && typeof item.date.toDate === 'function') {
              item.dateObj = item.date.toDate();
            } else {
              item.dateObj = new Date(item.date);
            }
          });
          interviews.sort((a, b) => b.dateObj - a.dateObj);
          
          setRecentInterviews(interviews.slice(0, 3));

          // Set user statistics for local storage/guest mode
          if (currentUser.isGuest || !userData) {
            const totalScore = interviews.reduce((acc, curr) => acc + (curr.score || 0), 0);
            const avg = interviews.length > 0 ? Math.round(totalScore / interviews.length) : 0;
            setUserData({
              displayName: currentUser.displayName,
              totalInterviews: interviews.length,
              averageScore: avg
            });
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, [currentUser]);

  const getFormattedDate = (interview) => {
    if (interview.date?.toDate) {
      return interview.date.toDate().toLocaleDateString();
    }
    return new Date(interview.date).toLocaleDateString();
  };

  if (loading) {
    return <div className="dashboard-loading">Loading your personalized dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Welcome back, <span className="gradient-text">{userData?.displayName || currentUser?.displayName || 'Guest'}</span>!</h1>
        <p>Ready for your next interview?</p>
      </header>

      <div className="dashboard-stats">
        <div className="stat-card glass-panel">
          <div className="stat-icon"><FiPlayCircle /></div>
          <div className="stat-info">
            <h3>Total Interviews</h3>
            <p className="stat-value">{userData?.totalInterviews || 0}</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon"><FiBarChart2 /></div>
          <div className="stat-info">
            <h3>Average Score</h3>
            <p className="stat-value">{userData?.averageScore || 0}%</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon"><FiClock /></div>
          <div className="stat-info">
            <h3>Time Practiced</h3>
            <p className="stat-value">0 hrs</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="recent-interviews glass-panel">
          <div className="section-header">
            <h2>Recent Interviews</h2>
            <Link to="/history" className="view-all">View All</Link>
          </div>
          
          {recentInterviews.length > 0 ? (
            <ul className="interview-list">
              {recentInterviews.map((interview) => (
                <li key={interview.id} className="interview-item">
                  <div className="interview-details">
                    <span className="interview-type">{interview.type}</span>
                    <span className="interview-date">{getFormattedDate(interview)}</span>
                  </div>
                  <div className="interview-score">
                    Score: <strong>{interview.score}%</strong>
                  </div>
                  <Link to={`/interview/results/${interview.sessionId}`} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.8rem', marginLeft: 'auto' }}>
                    View
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <p>You haven't taken any interviews yet.</p>
              <Link to="/interview/setup" className="btn-primary mt-4">Start First Interview</Link>
            </div>
          )}
        </div>

        <div className="quick-actions glass-panel">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <Link to="/interview/setup?type=HR" className="action-btn">
              <FiPlayCircle /> HR Interview
            </Link>
            <Link to="/interview/setup?type=Technical" className="action-btn">
              <FiPlayCircle /> Technical Interview
            </Link>
            <Link to="/interview/setup?type=Resume" className="action-btn special-btn">
              <FiFileText /> Upload Resume
            </Link>
            <Link to="/interview/voice" className="action-btn voice-btn">
              <FiMic /> Voice Interview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
