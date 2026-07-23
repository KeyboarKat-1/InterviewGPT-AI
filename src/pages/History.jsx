import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { FiClock, FiFileText, FiAward, FiArrowLeft } from 'react-icons/fi';
import './History.css';

const History = () => {
  const { currentUser } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        let allInterviews = [];

        // 1. Fetch from localStorage (always show these, especially for guest sessions)
        const localData = JSON.parse(localStorage.getItem('localInterviews') || '[]');
        allInterviews = [...localData];

        // 2. Fetch from Firestore if logged in (not a guest)
        if (currentUser && !currentUser.isGuest) {
          try {
            const q = query(
              collection(db, 'interviews'),
              where('userId', '==', currentUser.uid),
              orderBy('date', 'desc')
            );
            const querySnapshot = await getDocs(q);
            const firestoreInterviews = querySnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                // Handle Firestore Timestamp conversion
                date: data.date?.toDate ? data.date.toDate().toISOString() : data.date
              };
            });
            
            // Merge lists and prevent duplicates by sessionId
            const existingSessionIds = new Set(allInterviews.map(i => i.sessionId));
            firestoreInterviews.forEach(item => {
              if (!existingSessionIds.has(item.sessionId)) {
                allInterviews.push(item);
              }
            });
          } catch (dbError) {
            console.warn("Firestore history fetch failed:", dbError);
          }
        }

        // Sort combined list by date descending
        allInterviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        setInterviews(allInterviews);
      } catch (error) {
        console.error("Error loading history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentUser]);

  const getScoreClass = (score) => {
    if (score >= 80) return 'score-excellent';
    if (score >= 60) return 'score-good';
    return 'score-needs-improvement';
  };

  if (loading) {
    return <div className="history-loading">Retrieving your session history...</div>;
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <Link to="/dashboard" className="back-link"><FiArrowLeft /> Dashboard</Link>
        <h1>Interview History</h1>
        <p>Review all your past practice sessions and details</p>
      </div>

      {interviews.length > 0 ? (
        <div className="history-list">
          {interviews.map((interview) => (
            <div key={interview.id} className="history-item glass-panel">
              <div className="history-item-main">
                <div className="history-type-info">
                  <div className="history-icon">
                    <FiFileText />
                  </div>
                  <div>
                    <h3>{interview.type} Interview</h3>
                    <p className="history-date">
                      <FiClock /> {new Date(interview.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                <div className="history-stats">
                  <div className="history-stat">
                    <FiAward />
                    <span className={`history-score-value ${getScoreClass(interview.score)}`}>
                      {interview.score}%
                    </span>
                  </div>
                  <Link to={`/interview/results/${interview.sessionId}`} className="btn-secondary view-details-btn">
                    View Report
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="history-empty glass-panel text-center">
          <p>No completed interviews found in your history.</p>
          <Link to="/interview/setup" className="btn-primary mt-4">Start Your First Interview</Link>
        </div>
      )}
    </div>
  );
};

export default History;
